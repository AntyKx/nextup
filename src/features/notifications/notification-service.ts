import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, parseLocalDate } from '@/features/life-items/date-utils';
import { LifeItem } from '@/features/life-items/life-items-types';
import { emptyScheduleResult, NotificationTime, ScheduleResult } from '@/features/notifications/notification-policy';

export type { NotificationTime, ScheduleResult } from '@/features/notifications/notification-policy';
export {
  DEFAULT_NOTIFICATION_TIME,
  describeEnableWarning,
  describeScheduleWarning,
  mergeScheduleResults,
  shouldScheduleNotifications,
} from '@/features/notifications/notification-policy';

export type PersistNotificationId = (reminderId: string, notificationId: string | null) => Promise<void>;

const isWeb = Platform.OS === 'web';

/**
 * `persist` can now throw (a reminder deleted by a concurrent operation
 * makes the repository throw instead of silently no-op-ing). For best-effort
 * cleanup paths — clearing an ID for a reminder that's already gone is fine
 * to skip — log and move on instead of letting it blow up the whole loop.
 */
async function safePersist(reminderId: string, notificationId: string | null, persist: PersistNotificationId): Promise<void> {
  try {
    await persist(reminderId, notificationId);
  } catch (error) {
    console.error(`[notifications] failed to persist notification id for reminder ${reminderId}`, error);
  }
}

const safeClear = (reminderId: string, persist: PersistNotificationId) => safePersist(reminderId, null, persist);

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

function reminderTriggerDate(item: LifeItem, daysBefore: number, time: NotificationTime): Date {
  const trigger = addDays(parseLocalDate(item.dueDate), -daysBefore);
  trigger.setHours(time.hour, time.minute, 0, 0);
  return trigger;
}

/** Stamped into each notification's data so reconciliation can tell a reminder scheduled at an outdated time of day from a current one. */
function timeKey(time: NotificationTime): string {
  return `${time.hour}:${time.minute}`;
}

function reminderBody(daysBefore: number): string {
  if (daysBefore <= 0) return '今天到期';
  return `還有 ${daysBefore} 天到期`;
}

export async function scheduleItemNotifications(item: LifeItem, persist: PersistNotificationId, time: NotificationTime): Promise<ScheduleResult> {
  const result = emptyScheduleResult();
  if (isWeb || item.completedAt) return result;
  const now = Date.now();
  for (const reminder of item.reminders) {
    const triggerDate = reminderTriggerDate(item, reminder.daysBefore, time);
    if (triggerDate.getTime() <= now) {
      result.skippedPast += 1;
      // A reschedule cancels the old OS notification before calling in
      // here, but the DB's notification_id is only cleared when we
      // successfully schedule a replacement. Skipping that leaves the DB
      // pointing at an OS notification that no longer exists.
      if (reminder.notificationId) await safeClear(reminder.id, persist);
      continue;
    }
    let notificationId: string | null = null;
    try {
      notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: reminderBody(reminder.daysBefore),
          data: { itemId: item.id, reminderId: reminder.id, time: timeKey(time) },
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
    if (reminder.notificationId) await safeClear(reminder.id, persist);
  }
}

export async function rescheduleItemNotifications(item: LifeItem, persist: PersistNotificationId, time: NotificationTime): Promise<ScheduleResult> {
  if (isWeb) return emptyScheduleResult();
  await cancelItemNotifications(item);
  // Clear right after cancelling, before attempting to schedule replacements
  // — if the new schedule then fails or skips a reminder (past trigger
  // time), the DB must not keep pointing at the OS notification we just
  // cancelled. Scheduling then proceeds from a clean slate for every reminder.
  for (const reminder of item.reminders) {
    if (reminder.notificationId) await safeClear(reminder.id, persist);
  }
  const clearedItem: LifeItem = {
    ...item,
    reminders: item.reminders.map((reminder) => ({ ...reminder, notificationId: null })),
  };
  return scheduleItemNotifications(clearedItem, persist, time);
}

export async function cancelAllTracked(items: LifeItem[], persist: PersistNotificationId): Promise<void> {
  if (isWeb) return;
  for (const item of items) {
    await cancelItemNotifications(item);
    for (const reminder of item.reminders) {
      if (reminder.notificationId) await safeClear(reminder.id, persist);
    }
  }
}

let hasSyncedThisSession = false;

/**
 * Runs once per app start (module-level flag survives React StrictMode's
 * dev double-invoke). Reschedules active items whose reminders are missing
 * a live OS notification, and cancels OS notifications with no matching DB
 * reminder (ghosts left behind by a failed write or a reinstall) or that
 * fire at a time of day other than the current setting (a time change that
 * was interrupted before every item got rescheduled).
 */
export async function syncNotifications(items: LifeItem[], persist: PersistNotificationId, time: NotificationTime): Promise<void> {
  if (isWeb || hasSyncedThisSession) return;
  hasSyncedThisSession = true;

  let scheduled: Notifications.NotificationRequest[] = [];
  try {
    scheduled = await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[notifications] failed to read scheduled notifications for reconciliation', error);
    return;
  }

  const knownReminderIds = new Set<string>();
  for (const item of items) {
    if (item.completedAt) continue;
    for (const reminder of item.reminders) knownReminderIds.add(reminder.id);
  }

  const currentTimeKey = timeKey(time);
  const liveIdsByReminderId = new Map<string, string[]>();
  for (const request of scheduled) {
    const data = request.content.data as { reminderId?: string; time?: string } | undefined;
    if (!data?.reminderId) continue;
    // Orphaned (no DB reminder) or stale (scheduled for an old time of day,
    // including pre-0.5 notifications that carry no time stamp at all):
    // cancel it and don't count it as live, so the loop below reschedules.
    if (!knownReminderIds.has(data.reminderId) || data.time !== currentTimeKey) {
      try {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      } catch (error) {
        console.error('[notifications] failed to cancel orphaned or stale notification', error);
      }
      continue;
    }
    const list = liveIdsByReminderId.get(data.reminderId) ?? [];
    list.push(request.identifier);
    liveIdsByReminderId.set(data.reminderId, list);
  }

  for (const item of items) {
    if (item.completedAt) continue;
    const missingLiveNotification = item.reminders.some((reminder) => !liveIdsByReminderId.has(reminder.id));
    if (missingLiveNotification) {
      const result = await rescheduleItemNotifications(item, persist, time);
      if (result.failed > 0) {
        console.error(`[notifications] reconciliation reschedule had ${result.failed} failure(s) for item ${item.id}`);
      }
      continue;
    }
    for (const reminder of item.reminders) {
      const liveIds = liveIdsByReminderId.get(reminder.id);
      if (!liveIds) continue;
      if (liveIds.length > 1) {
        // A past bug/race left more than one live OS notification for the
        // same reminder. Keep whichever the DB already points at (if it's
        // among them, so nothing changes unnecessarily), cancel the rest.
        const keep = reminder.notificationId && liveIds.includes(reminder.notificationId) ? reminder.notificationId : liveIds[0];
        for (const id of liveIds) {
          if (id === keep) continue;
          try {
            await Notifications.cancelScheduledNotificationAsync(id);
          } catch (error) {
            console.error('[notifications] failed to cancel duplicate notification', error);
          }
        }
        if (keep !== reminder.notificationId) await safePersist(reminder.id, keep, persist);
        continue;
      }
      // Exactly one live OS notification, but the DB's recorded ID can
      // still be stale (e.g. a previous persist failed after the OS call
      // succeeded) — bring the DB back in sync with what's actually scheduled.
      const liveId = liveIds[0];
      if (liveId !== reminder.notificationId) {
        await safePersist(reminder.id, liveId, persist);
      }
    }
  }
}
