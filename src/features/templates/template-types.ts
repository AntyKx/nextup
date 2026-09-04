import { Category, Recurrence, RecurrenceMode } from '@/features/life-items/life-items-types';

/**
 * A template represents a common life cycle (e.g. "passport renewal"), not
 * just a title shortcut — it carries the recurrence shape that makes NextUp
 * different from a plain todo list. Picking one only pre-fills the Add form;
 * the user always confirms (and can change) every field before saving.
 */
export type LifeTemplate = {
  id: string;
  title: string;
  category: Category;
  /** Plain-language explanation of the recurrence behavior — never engineering terms. */
  description: string;
  /** Suggested days-from-now for the due date field. Omit when the real date can't be guessed (passports, insurance policies, warranties — the user must check their own document). */
  defaultOffsetDays?: number;
  recurrence: Recurrence;
  recurrenceMode: RecurrenceMode;
  reminderDays: number[];
  notePlaceholder?: string;
  featured?: boolean;
};
