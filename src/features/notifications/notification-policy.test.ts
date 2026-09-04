/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeScheduleWarning, shouldScheduleNotifications } from './notification-policy';

test('shouldScheduleNotifications: only true when enabled and the item is not completed', () => {
  assert.equal(shouldScheduleNotifications(true, null), true);
  assert.equal(shouldScheduleNotifications(false, null), false);
  assert.equal(shouldScheduleNotifications(true, '2026-09-01T00:00:00.000Z'), false);
  assert.equal(shouldScheduleNotifications(false, '2026-09-01T00:00:00.000Z'), false);
});

test('describeScheduleWarning: no warning when nothing failed', () => {
  assert.equal(describeScheduleWarning({ scheduled: 2, failed: 0, skippedPast: 1 }), undefined);
});

test('describeScheduleWarning: full-failure message when every attempt failed', () => {
  assert.equal(describeScheduleWarning({ scheduled: 0, failed: 3, skippedPast: 0 }), '事項已儲存，但提醒未能排程');
});

test('describeScheduleWarning: partial-failure message when some reminders still scheduled', () => {
  assert.equal(describeScheduleWarning({ scheduled: 2, failed: 1, skippedPast: 0 }), '事項已儲存，但有部分提醒未能排程');
});
