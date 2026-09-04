/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addPeriodClamped, calculateNextDueDate, daysUntil, resolveAnchorDayOnUpdate, resolveUndoState, timestampToLocalIsoDate } from './date-utils';

// Node reads TZ lazily on every Date computation, so setting it here (before
// any Date work in this file) makes the local-date tests below deterministic
// regardless of the host machine's own timezone.
process.env.TZ = 'Asia/Taipei';

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

test('timestampToLocalIsoDate: converts using the local calendar day, not a UTC slice', () => {
  // 2026-09-03T16:30:00Z is 2026-09-04 00:30 in Asia/Taipei (UTC+8) — a
  // naive `.slice(0, 10)` on the timestamp would wrongly read 2026-09-03.
  const timestamp = '2026-09-03T16:30:00.000Z';
  assert.equal(timestampToLocalIsoDate(timestamp), '2026-09-04');
  assert.notEqual(timestampToLocalIsoDate(timestamp), timestamp.slice(0, 10));
});

test('resolveAnchorDayOnUpdate: keeps the existing anchor day when dueDate is unchanged or omitted', () => {
  assert.equal(resolveAnchorDayOnUpdate('2027-02-28', 31, '2027-02-28'), 31);
  assert.equal(resolveAnchorDayOnUpdate('2027-02-28', 31, undefined), 31);
});

test('resolveAnchorDayOnUpdate: only recomputes when dueDate actually changes', () => {
  assert.equal(resolveAnchorDayOnUpdate('2027-02-28', 31, '2027-02-15'), 15);
});

test('resolveUndoState: restores the exact previous state when a snapshot was captured', () => {
  const state = resolveUndoState(
    {
      scheduledDate: '2027-02-28',
      previousDueDate: '2027-02-28',
      previousAnchorDay: 31,
      previousCompletedAt: null,
      previousLastCompletedAt: '2027-01-31T00:00:00.000Z',
    },
    null,
  );
  assert.deepEqual(state, {
    dueDate: '2027-02-28',
    anchorDay: 31,
    completedAt: null,
    lastCompletedAt: '2027-01-31T00:00:00.000Z',
  });
});

test('resolveUndoState: falls back to recomputing anchor day for legacy history with no snapshot', () => {
  const state = resolveUndoState(
    {
      scheduledDate: '2027-02-28',
      previousDueDate: null,
      previousAnchorDay: null,
      previousCompletedAt: null,
      previousLastCompletedAt: null,
    },
    '2027-01-15T00:00:00.000Z',
  );
  assert.deepEqual(state, {
    dueDate: '2027-02-28',
    anchorDay: 28,
    completedAt: null,
    lastCompletedAt: '2027-01-15T00:00:00.000Z',
  });
});
