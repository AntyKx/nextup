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
 * reliable reminder, so a silent scheduling failure is never acceptable —
 * this is what lets the caller show a Snackbar instead of pretending
 * everything worked.
 */
export function describeScheduleWarning(result: ScheduleResult): string | undefined {
  if (result.failed === 0) return undefined;
  return result.scheduled === 0 ? '事項已儲存，但提醒未能排程' : '事項已儲存，但有部分提醒未能排程';
}
