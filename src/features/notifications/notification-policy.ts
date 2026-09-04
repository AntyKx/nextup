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

export const DEFAULT_NOTIFICATION_HOUR = 9;

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
