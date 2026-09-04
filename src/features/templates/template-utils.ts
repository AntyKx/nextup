import { Category, Recurrence, RecurrenceMode } from '@/features/life-items/life-items-types';
import { templateCatalog } from '@/features/templates/template-catalog';
import { LifeTemplate } from '@/features/templates/template-types';

export function getTemplateById(id: string): LifeTemplate | undefined {
  return templateCatalog.find((template) => template.id === id);
}

export function getFeaturedTemplates(): LifeTemplate[] {
  return templateCatalog.filter((template) => template.featured);
}

export function getTemplatesByCategory(category: Category | 'all'): LifeTemplate[] {
  if (category === 'all') return templateCatalog;
  return templateCatalog.filter((template) => template.category === category);
}

const VALID_CATEGORIES: Category[] = ['document', 'vehicle', 'home', 'digital', 'money', 'travel'];
const VALID_RECURRENCES: Recurrence[] = ['none', 'monthly', 'quarterly', 'yearly'];
const VALID_RECURRENCE_MODES: RecurrenceMode[] = ['fixed_schedule', 'from_completion'];

/** Pure validation over plain data — no I/O — so the catalog can be checked by a unit test (see `template-utils.test.ts`). */
export function validateTemplateCatalog(catalog: LifeTemplate[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  for (const template of catalog) {
    if (seenIds.has(template.id)) errors.push(`duplicate id: ${template.id}`);
    seenIds.add(template.id);
    if (!template.title.trim()) errors.push(`empty title: ${template.id}`);
    if (template.reminderDays.some((days) => days < 0)) errors.push(`negative reminderDays: ${template.id}`);
    if (new Set(template.reminderDays).size !== template.reminderDays.length) errors.push(`duplicate reminderDays: ${template.id}`);
    if (!VALID_CATEGORIES.includes(template.category)) errors.push(`invalid category: ${template.id}`);
    if (!VALID_RECURRENCES.includes(template.recurrence)) errors.push(`invalid recurrence: ${template.id}`);
    if (!VALID_RECURRENCE_MODES.includes(template.recurrenceMode)) errors.push(`invalid recurrenceMode: ${template.id}`);
  }
  return errors;
}
