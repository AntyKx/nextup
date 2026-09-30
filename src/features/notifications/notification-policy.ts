/**
 * Pure policy logic for notifications — zero expo-notifications / React
 * Native imports so this can be unit-tested directly under plain Node (see
 * `notification-policy.test.ts`). Anything that actually touches the OS
 * notification APIs lives in `notification-service.ts`.
 */

export type ScheduleResult = {
  scheduled: number;
  failed: number;
  skippedPast: number;
};

/** Time of day (device-local) every reminder fires at — one global setting, not per item. */
export type NotificationTime = { hour: number; minute: number };

export const DEFAULT_NOTIFICATION_TIME: NotificationTime = { hour: 9, minute: 0 };

/** The choices offered in Settings — whole hours across a waking day is enough precision for "remember to renew X". */
export const NOTIFICATION_TIME_OPTIONS: NotificationTime[] = [7, 8, 9, 10, 12, 18, 20, 21].map((hour) => ({ hour, minute: 0 }));

/**
 * Whatever is stored in app_settings is untrusted (older build, hand-edited
 * DB, restored backup) — anything that isn't a real time of day falls back
 * to the default rather than scheduling a reminder at hour 25.
 */
export function normalizeNotificationTime(value: unknown): NotificationTime {
  if (!value || typeof value !== 'object') return DEFAULT_NOTIFICATION_TIME;
  const { hour, minute } = value as { hour?: unknown; minute?: unknown };
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return DEFAULT_NOTIFICATION_TIME;
  if ((hour as number) < 0 || (hour as number) > 23 || (minute as number) < 0 || (minute as number) > 59) return DEFAULT_NOTIFICATION_TIME;
  return { hour: hour as number, minute: minute as number };
}

export function isSameNotificationTime(a: NotificationTime, b: NotificationTime): boolean {
  return a.hour === b.hour && a.minute === b.minute;
}

/** 「上午 9:00」「中午 12:00」「晚上 8:00」 — 12-hour clock with a Chinese day-period word, matching how people say it. */
export function formatNotificationTime({ hour, minute }: NotificationTime): string {
  const period = hour < 5 ? '凌晨' : hour < 12 ? '上午' : hour < 13 ? '中午' : hour < 18 ? '下午' : '晚上';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`;
}

export function emptyScheduleResult(): ScheduleResult {
  return { scheduled: 0, failed: 0, skippedPast: 0 };
}

/** The single place that decides whether an item should have live OS notifications. */
export function shouldScheduleNotifications(enabled: boolean, completedAt: string | null): boolean {
  return enabled && !completedAt;
}

/**
 * Turns a schedule outcome into user-facing copy. NextUp's core promise is a
 * reliable reminder, so a silent scheduling failure — or a reminder time
 * that was already in the past and got silently skipped — is never
 * acceptable. `failed` (a real API/persist failure) and `skippedPast` (the
 * reminder time had already elapsed, so skipping it was correct) are kept
 * semantically distinct: they get different copy so the user isn't told
 * "failed" for something that was actually just too late to schedule.
 * `failed` takes priority when both are present, since it's the more
 * actionable problem.
 */
export function describeScheduleWarning(result: ScheduleResult): string | undefined {
  if (result.failed > 0) {
    return result.scheduled === 0 ? '事項已儲存，但提醒未能排程' : '事項已儲存，但有部分提醒未能排程';
  }
  if (result.skippedPast > 0) {
    return result.scheduled === 0 ? '目前沒有可排程的未來提醒，請調整提醒天數或日期' : '部分提醒時間已經過了，未能排程';
  }
  return undefined;
}

/** Same policy as `describeScheduleWarning`, worded for the Settings global-toggle flow rather than a single item save. */
export function describeEnableWarning(result: ScheduleResult): string | undefined {
  if (result.failed > 0) {
    return result.scheduled === 0 ? '到期提醒已開啟，但提醒未能排程' : '到期提醒已開啟，但部分提醒未能排程';
  }
  if (result.skippedPast > 0) {
    return result.scheduled === 0 ? '到期提醒已開啟，但目前沒有可排程的未來提醒' : '到期提醒已開啟，但部分提醒時間已經過了';
  }
  return undefined;
}

/**
 * For operations that reschedule many items at once (changing the reminder
 * time, importing a backup). Only a real failure is worth a warning here —
 * overdue items having no future reminder to schedule is expected and would
 * otherwise make nearly every bulk operation look like it went wrong.
 */
export function describeBulkScheduleWarning(result: ScheduleResult): string | undefined {
  if (result.failed === 0) return undefined;
  return result.scheduled === 0 ? '提醒未能排程，請稍後再試' : '有部分提醒未能排程';
}

export function mergeScheduleResults(...results: ScheduleResult[]): ScheduleResult {
  return results.reduce(
    (sum, result) => ({
      scheduled: sum.scheduled + result.scheduled,
      failed: sum.failed + result.failed,
      skippedPast: sum.skippedPast + result.skippedPast,
    }),
    emptyScheduleResult(),
  );
}
