/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_NOTIFICATION_TIME,
  describeBulkScheduleWarning,
  describeEnableWarning,
  describeScheduleWarning,
  formatNotificationTime,
  isSameNotificationTime,
  mergeScheduleResults,
  normalizeNotificationTime,
  NOTIFICATION_TIME_OPTIONS,
  shouldScheduleNotifications,
} from './notification-policy';

test('shouldScheduleNotifications: only true when enabled and the item is not completed', () => {
  assert.equal(shouldScheduleNotifications(true, null), true);
  assert.equal(shouldScheduleNotifications(false, null), false);
  assert.equal(shouldScheduleNotifications(true, '2026-09-01T00:00:00.000Z'), false);
  assert.equal(shouldScheduleNotifications(false, '2026-09-01T00:00:00.000Z'), false);
});

test('describeScheduleWarning: no warning when every reminder scheduled cleanly', () => {
  assert.equal(describeScheduleWarning({ scheduled: 2, failed: 0, skippedPast: 0 }), undefined);
});

test('describeScheduleWarning: full-failure message when every attempt failed', () => {
  assert.equal(describeScheduleWarning({ scheduled: 0, failed: 3, skippedPast: 0 }), '事項已儲存，但提醒未能排程');
});

test('describeScheduleWarning: partial-failure message when some reminders still scheduled', () => {
  assert.equal(describeScheduleWarning({ scheduled: 2, failed: 1, skippedPast: 0 }), '事項已儲存，但有部分提醒未能排程');
});

test('describeScheduleWarning: some reminder times already past, but at least one still scheduled', () => {
  assert.equal(describeScheduleWarning({ scheduled: 2, failed: 0, skippedPast: 1 }), '部分提醒時間已經過了，未能排程');
});

test('describeScheduleWarning: every reminder time already past — nothing could be scheduled', () => {
  assert.equal(describeScheduleWarning({ scheduled: 0, failed: 0, skippedPast: 3 }), '目前沒有可排程的未來提醒，請調整提醒天數或日期');
});

test('describeScheduleWarning: failed and skippedPast mixed — failed takes priority', () => {
  assert.equal(describeScheduleWarning({ scheduled: 1, failed: 1, skippedPast: 1 }), '事項已儲存，但有部分提醒未能排程');
});

test('describeEnableWarning: mirrors describeScheduleWarning wording for the global toggle', () => {
  assert.equal(describeEnableWarning({ scheduled: 5, failed: 0, skippedPast: 0 }), undefined);
  assert.equal(describeEnableWarning({ scheduled: 5, failed: 2, skippedPast: 0 }), '到期提醒已開啟，但部分提醒未能排程');
  assert.equal(describeEnableWarning({ scheduled: 0, failed: 5, skippedPast: 0 }), '到期提醒已開啟，但提醒未能排程');
  assert.equal(describeEnableWarning({ scheduled: 0, failed: 0, skippedPast: 5 }), '到期提醒已開啟，但目前沒有可排程的未來提醒');
});

test('mergeScheduleResults: aggregates multiple results field-by-field', () => {
  const merged = mergeScheduleResults(
    { scheduled: 2, failed: 1, skippedPast: 0 },
    { scheduled: 0, failed: 0, skippedPast: 3 },
    { scheduled: 1, failed: 0, skippedPast: 1 },
  );
  assert.deepEqual(merged, { scheduled: 3, failed: 1, skippedPast: 4 });
});

test('mergeScheduleResults: no arguments returns an empty result', () => {
  assert.deepEqual(mergeScheduleResults(), { scheduled: 0, failed: 0, skippedPast: 0 });
});

test('normalizeNotificationTime: keeps a valid stored time', () => {
  assert.deepEqual(normalizeNotificationTime({ hour: 20, minute: 30 }), { hour: 20, minute: 30 });
  assert.deepEqual(normalizeNotificationTime({ hour: 0, minute: 0 }), { hour: 0, minute: 0 });
});

test('normalizeNotificationTime: falls back to 9:00 for missing or out-of-range values', () => {
  assert.deepEqual(normalizeNotificationTime(null), DEFAULT_NOTIFICATION_TIME);
  assert.deepEqual(normalizeNotificationTime('09:00'), DEFAULT_NOTIFICATION_TIME);
  assert.deepEqual(normalizeNotificationTime({ hour: 24, minute: 0 }), DEFAULT_NOTIFICATION_TIME);
  assert.deepEqual(normalizeNotificationTime({ hour: 8, minute: 60 }), DEFAULT_NOTIFICATION_TIME);
  assert.deepEqual(normalizeNotificationTime({ hour: 8.5, minute: 0 }), DEFAULT_NOTIFICATION_TIME);
  assert.deepEqual(normalizeNotificationTime({ hour: 8 }), DEFAULT_NOTIFICATION_TIME);
});

test('formatNotificationTime: 12-hour clock with a Chinese day-period word', () => {
  assert.equal(formatNotificationTime({ hour: 9, minute: 0 }), '上午 9:00');
  assert.equal(formatNotificationTime({ hour: 12, minute: 0 }), '中午 12:00');
  assert.equal(formatNotificationTime({ hour: 15, minute: 5 }), '下午 3:05');
  assert.equal(formatNotificationTime({ hour: 20, minute: 0 }), '晚上 8:00');
  assert.equal(formatNotificationTime({ hour: 0, minute: 30 }), '凌晨 12:30');
});

test('NOTIFICATION_TIME_OPTIONS: includes the 9:00 default so it always shows as selected', () => {
  assert.ok(NOTIFICATION_TIME_OPTIONS.some((option) => isSameNotificationTime(option, DEFAULT_NOTIFICATION_TIME)));
});

test('describeBulkScheduleWarning: overdue items with no future reminder are not a warning', () => {
  assert.equal(describeBulkScheduleWarning({ scheduled: 3, failed: 0, skippedPast: 5 }), undefined);
  assert.equal(describeBulkScheduleWarning({ scheduled: 0, failed: 0, skippedPast: 5 }), undefined);
});

test('describeBulkScheduleWarning: real failures are reported', () => {
  assert.equal(describeBulkScheduleWarning({ scheduled: 0, failed: 2, skippedPast: 0 }), '提醒未能排程，請稍後再試');
  assert.equal(describeBulkScheduleWarning({ scheduled: 4, failed: 1, skippedPast: 0 }), '有部分提醒未能排程');
});
