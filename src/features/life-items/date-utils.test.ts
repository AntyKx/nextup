/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addPeriodClamped, calculateNextDueDate, daysUntil } from './date-utils';

test('addPeriodClamped: Jan 31 monthly clamps through short months and recovers', () => {
  assert.equal(addPeriodClamped('2026-01-31', 'monthly', 31, 1), '2026-02-28');
  assert.equal(addPeriodClamped('2026-01-31', 'monthly', 31, 2), '2026-03-31');
  assert.equal(addPeriodClamped('2026-01-31', 'monthly', 31, 3), '2026-04-30');
  assert.equal(addPeriodClamped('2026-01-31', 'monthly', 31, 4), '2026-05-31');
});

test('addPeriodClamped: Feb 29 yearly clamps in non-leap years, resumes on the next leap year', () => {
  assert.equal(addPeriodClamped('2028-02-29', 'yearly', 29, 1), '2029-02-28');
  assert.equal(addPeriodClamped('2028-02-29', 'yearly', 29, 4), '2032-02-29');
});

test('addPeriodClamped: quarterly clamps to the target month end', () => {
  assert.equal(addPeriodClamped('2026-01-31', 'quarterly', 31, 1), '2026-04-30');
});

test('calculateNextDueDate: fixed_schedule overdue by one period advances to the next period', () => {
  const result = calculateNextDueDate({
    dueDate: '2026-08-01',
    recurrence: 'monthly',
    recurrenceMode: 'fixed_schedule',
    anchorDay: 1,
    completedAt: '2026-08-15T00:00:00.000Z',
    today: '2026-08-15',
  });
  assert.equal(result.nextDueDate, '2026-09-01');
  assert.equal(result.nextAnchorDay, 1);
});

test('calculateNextDueDate: fixed_schedule overdue by many periods jumps to the next future occurrence', () => {
  const result = calculateNextDueDate({
    dueDate: '2026-05-01',
    recurrence: 'monthly',
    recurrenceMode: 'fixed_schedule',
    anchorDay: 1,
    completedAt: '2026-09-03T00:00:00.000Z',
    today: '2026-09-03',
  });
  assert.equal(result.nextDueDate, '2026-10-01');
});

test('calculateNextDueDate: from_completion restarts the cadence from today', () => {
  const result = calculateNextDueDate({
    dueDate: '2026-05-01',
    recurrence: 'monthly',
    recurrenceMode: 'from_completion',
    anchorDay: 1,
    completedAt: '2026-09-03T10:00:00.000Z',
    today: '2026-09-03',
  });
  assert.equal(result.nextDueDate, '2026-10-03');
  assert.equal(result.nextAnchorDay, 3);
});

test('daysUntil: overdue, today, and future dates', () => {
  const today = new Date(2026, 8, 5, 12); // 2026-09-05
  assert.equal(daysUntil('2026-09-01', today), -4);
  assert.equal(daysUntil('2026-09-05', today), 0);
  assert.equal(daysUntil('2026-09-10', today), 5);
});
