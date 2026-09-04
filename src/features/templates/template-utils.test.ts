/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { templateCatalog } from './template-catalog';
import { LifeTemplate } from './template-types';
import { validateTemplateCatalog } from './template-utils';

test('validateTemplateCatalog: the real catalog has no violations', () => {
  assert.deepEqual(validateTemplateCatalog(templateCatalog), []);
});

const base: LifeTemplate = {
  id: 'sample',
  title: '樣本範本',
  category: 'home',
  description: '測試用',
  recurrence: 'none',
  recurrenceMode: 'fixed_schedule',
  reminderDays: [7, 1],
};

test('validateTemplateCatalog: catches a duplicate id', () => {
  const errors = validateTemplateCatalog([base, { ...base }]);
  assert.ok(errors.some((error) => error.includes('duplicate id')));
});

test('validateTemplateCatalog: catches an empty title', () => {
  const errors = validateTemplateCatalog([{ ...base, title: '   ' }]);
  assert.ok(errors.some((error) => error.includes('empty title')));
});

test('validateTemplateCatalog: catches a negative reminderDays entry', () => {
  const errors = validateTemplateCatalog([{ ...base, reminderDays: [7, -1] }]);
  assert.ok(errors.some((error) => error.includes('negative reminderDays')));
});

test('validateTemplateCatalog: catches duplicate reminderDays', () => {
  const errors = validateTemplateCatalog([{ ...base, reminderDays: [7, 7] }]);
  assert.ok(errors.some((error) => error.includes('duplicate reminderDays')));
});

test('validateTemplateCatalog: catches an invalid category/recurrence/recurrenceMode', () => {
  const errors = validateTemplateCatalog([
    { ...base, category: 'invalid' as LifeTemplate['category'] },
    { ...base, id: 'sample-2', recurrence: 'weekly' as LifeTemplate['recurrence'] },
    { ...base, id: 'sample-3', recurrenceMode: 'manual' as LifeTemplate['recurrenceMode'] },
  ]);
  assert.ok(errors.some((error) => error.includes('invalid category')));
  assert.ok(errors.some((error) => error.includes('invalid recurrence:')));
  assert.ok(errors.some((error) => error.includes('invalid recurrenceMode')));
});

test('validateTemplateCatalog: a fully valid template produces no errors', () => {
  assert.deepEqual(validateTemplateCatalog([base]), []);
});

// P1-5/P1-7: templates whose real due date the app has no way to guess must
// never carry a defaultOffsetDays — that would silently fall back to a
// fabricated date (e.g. "today + 30") for something like a passport expiry.
const templatesRequiringExplicitDate = [
  'passport-renewal',
  'drivers-license-renewal',
  'car-insurance-renewal',
  'scooter-insurance-renewal',
  'phone-warranty',
  'appliance-warranty',
  'credit-card-annual-fee',
  'visa-expiration',
];

test('templateCatalog: templates with no guessable real date have no defaultOffsetDays', () => {
  for (const id of templatesRequiringExplicitDate) {
    const template = templateCatalog.find((candidate) => candidate.id === id);
    assert.ok(template, `expected a template with id ${id}`);
    assert.equal(template?.defaultOffsetDays, undefined, `${id} should not guess a due date`);
  }
});
