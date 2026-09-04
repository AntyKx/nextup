import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, parseLocalDate } from '@/features/life-items/date-utils';
import { LifeItem } from '@/features/life-items/life-items-types';
import { DEFAULT_NOTIFICATION_HOUR, emptyScheduleResult, ScheduleResult } from '@/features/notifications/notification-policy';

export type { ScheduleResult } from '@/features/notifications/notification-policy';
export {
  DEFAULT_NOTIFICATION_HOUR,
  describeEnableWarning,
  describeScheduleWarning,
  mergeScheduleResults,
  shouldScheduleNotifications,
} from '@/features/notifications/notification-policy';

export type PersistNotificationId = (reminderId: string, notificationId: string | null) => Promise<void>;

const isWeb = Platform.OS === 'web';

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestPermission(): Promise<boolean> {
  if (isWeb) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (isWeb) return 'undetermined';
  const result = await Notifications.getPermissionsAsync();
  return (result.status as 'granted' | 'denied' | 'undetermined') ?? 'undetermined';
}

function reminderTriggerDate(item: LifeItem, daysBefore: number): Date {
  const trigger = addDays(parseLocalDate(item.dueDate), -daysBefore);
  trigger.setHours(DEFAULT_NOTIFICATION_HOUR, 0, 0, 0);
  return trigger;
}

function reminderBody(daysBefore: number): string {
  if (daysBefore <= 0) return '今天到期';
  return `還有 ${daysBefore} 天到期`;
}

export async function scheduleItemNotifications(item: LifeItem, persist: PersistNotificationId): Promise<ScheduleResult> {
  const result = emptyScheduleResult();
  if (isWeb || item.completedAt) return result;
  const now = Date.now();
  for (const reminder of item.reminders) {
    const triggerDate = reminderTriggerDate(item, reminder.daysBefore);
    if (triggerDate.getTime() <= now) {
      result.skippedPast += 1;
      continue;
    }
    let notificationId: string | null = null;
    try {
      notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: reminderBody(reminder.daysBefore),
          data: { itemId: item.id, reminderId: reminder.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
      await persist(reminder.id, notificationId);
      result.scheduled += 1;
    } catch (error) {
      console.error(`[notifications] failed to schedule reminder ${reminder.id} for item ${item.id}`, error);
      // The OS call can succeed even when persisting its ID fails — without
      // this rollback that leaves a live OS notification the DB has no
      // record of and can never cancel.
      if (notificationId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        } catch (rollbackError) {
          console.error(`[notifications] failed to roll back notification ${notificationId} after persist failure`, rollbackError);
        }
      }
      result.failed += 1;
    }
  }
  return result;
}

export async function cancelItemNotifications(item: LifeItem): Promise<void> {
  if (isWeb) return;
  for (const reminder of item.reminders) {
    if (!reminder.notificationId) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
    } catch (error) {
      console.error(`[notifications] failed to cancel notification ${reminder.notificationId}`, error);
    }
  }
}

/**
 * Like `cancelItemNotifications`, but also nulls out `notification_id` in
 * the DB. Use this where the reminder rows survive the cancellation (e.g. a
 * completed one-time item) — otherwise the DB keeps pointing at an OS
 * notification that no longer exists.
 */
export async function cancelItemNotificationsAndClear(item: LifeItem, persist: PersistNotificationId): Promise<void> {
  await cancelItemNotifications(item);
  if (isWeb) return;
  for (const reminder of item.reminders) {
    if (reminder.notificationId) await persist(reminder.id, null);
  }
}

export async function rescheduleItemNotifications(item: LifeItem, persist: PersistNotificationId): Promise<ScheduleResult> {
  if (isWeb) return emptyScheduleResult();
  await cancelItemNotifications(item);
  return scheduleItemNotifications(item, persist);
}

export async function cancelAllTracked(items: LifeItem[], persist: PersistNotificationId): Promise<void> {
  if (isWeb) return;
  for (const item of items) {
    await cancelItemNotifications(item);
    for (const reminder of item.reminders) {
      if (reminder.notificationId) await persist(reminder.id, null);
    }
  }
}

let hasSyncedThisSession = false;

/**
 * Runs once per app start (module-level flag survives React StrictMode's
 * dev double-invoke). Reschedules active items whose reminders are missing
 * a live OS notification, and cancels OS notifications with no matching DB
 * reminder (ghosts left behind by a failed write or a reinstall).
 */
export async function syncNotifications(items: LifeItem[], persist: PersistNotificationId): Promise<void> {
  if (isWeb || hasSyncedThisSession) return;
  hasSyncedThisSession = true;

  let scheduled: Notifications.NotificationRequest[] = [];
  try {
    scheduled = await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[notifications] failed to read scheduled notifications for reconciliation', error);
    return;
  }

  const liveIdByReminderId = new Map<string, string>();
  for (const request of scheduled) {
    const data = request.content.data as { reminderId?: string } | undefined;
    if (data?.reminderId) liveIdByReminderId.set(data.reminderId, request.identifier);
  }

  const knownReminderIds = new Set<string>();
  for (const item of items) {
    if (item.completedAt) continue;
    for (const reminder of item.reminders) knownReminderIds.add(reminder.id);
  }

  for (const request of scheduled) {
    const data = request.content.data as { reminderId?: string } | undefined;
    if (data?.reminderId && !knownReminderIds.has(data.reminderId)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      } catch (error) {
        console.error('[notifications] failed to cancel orphaned notification', error);
      }
    }
  }

  for (const item of items) {
    if (item.completedAt) continue;
    const missingLiveNotification = item.reminders.some((reminder) => !liveIdByReminderId.has(reminder.id));
    if (missingLiveNotification) {
      const result = await rescheduleItemNotifications(item, persist);
      if (result.failed > 0) {
        console.error(`[notifications] reconciliation reschedule had ${result.failed} failure(s) for item ${item.id}`);
      }
      continue;
    }
    // Every reminder has a live OS notification, but the DB's recorded ID
    // can still be stale (e.g. a previous persist failed after the OS call
    // succeeded) — bring the DB back in sync with what's actually scheduled.
    for (const reminder of item.reminders) {
      const liveId = liveIdByReminderId.get(reminder.id);
      if (liveId && liveId !== reminder.notificationId) {
        await persist(reminder.id, liveId);
      }
    }
  }
}
