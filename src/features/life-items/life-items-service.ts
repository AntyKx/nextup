import { calculateNextDueDate, formatIsoDate, parseLocalDate } from '@/features/life-items/date-utils';
import { lifeItemsRepository } from '@/features/life-items/life-items-repository';
import {
  CompletionHistoryEntry,
  LifeItem,
  LifeItemReminder,
  NewLifeItemInput,
  UpdateLifeItemInput,
} from '@/features/life-items/life-items-types';
import * as notificationService from '@/features/notifications/notification-service';
import { emptyScheduleResult, mergeScheduleResults, ScheduleResult, shouldScheduleNotifications } from '@/features/notifications/notification-policy';

const persistNotificationId = (reminderId: string, notificationId: string | null) =>
  lifeItemsRepository.setReminderNotificationId(reminderId, notificationId);

class AlreadyInFlightError extends Error {
  constructor(id: string) {
    super(`life-items-service: completeItem already in flight for ${id}`);
  }
}

const inFlightCompletions = new Set<string>();

/** Every add/edit/complete/undo path funnels through here so the global switch is enforced in one place. */
async function scheduleIfEnabled(item: LifeItem): Promise<ScheduleResult> {
  const enabled = await getNotificationsEnabled();
  if (!shouldScheduleNotifications(enabled, item.completedAt)) return emptyScheduleResult();
  return notificationService.scheduleItemNotifications(item, persistNotificationId);
}

/** Like `scheduleIfEnabled`, but also guarantees no stray OS notification survives when the switch is off. */
async function rescheduleIfEnabled(item: LifeItem): Promise<ScheduleResult> {
  const enabled = await getNotificationsEnabled();
  if (!shouldScheduleNotifications(enabled, item.completedAt)) {
    await notificationService.cancelItemNotifications(item);
    return emptyScheduleResult();
  }
  return notificationService.rescheduleItemNotifications(item, persistNotificationId);
}

export async function init(): Promise<LifeItem[]> {
  await lifeItemsRepository.init();
  return lifeItemsRepository.listItems();
}

export async function listItems(): Promise<LifeItem[]> {
  return lifeItemsRepository.listItems();
}

export async function getItem(id: string): Promise<LifeItem | null> {
  return lifeItemsRepository.getItem(id);
}

export async function addItem(input: NewLifeItemInput): Promise<{ item: LifeItem; notificationWarning?: string }> {
  const anchorDay = parseLocalDate(input.dueDate).getDate();
  const item = await lifeItemsRepository.createItem({ ...input, anchorDay });
  const result = await scheduleIfEnabled(item);
  const withNotificationIds = await lifeItemsRepository.getItem(item.id);
  return { item: withNotificationIds ?? item, notificationWarning: notificationService.describeScheduleWarning(result) };
}

async function restoreNotificationsAfterFailedWrite(existing: LifeItem | null, context: string): Promise<void> {
  if (!existing) return;
  try {
    await scheduleIfEnabled(existing);
  } catch (restoreError) {
    console.error(`[life-items] failed to restore notifications after ${context} DB failure`, restoreError);
  }
}

export async function updateItem(id: string, patch: UpdateLifeItemInput): Promise<{ item: LifeItem; notificationWarning?: string }> {
  // Cancel using the PRE-update reminders/notification IDs first — the
  // repository replaces the reminders rows wholesale (fresh IDs, no
  // notification_id), so anything we don't cancel here becomes a ghost
  // notification the app can no longer reference.
  const existing = await lifeItemsRepository.getItem(id);
  if (existing) await notificationService.cancelItemNotifications(existing);
  let updated: LifeItem;
  try {
    updated = await lifeItemsRepository.updateItem(id, patch);
  } catch (error) {
    // The DB write failed, so the item is unchanged — but we already
    // cancelled its old notifications above. Reschedule them so a failed
    // edit doesn't silently kill a reminder that was working fine before.
    await restoreNotificationsAfterFailedWrite(existing, 'updateItem');
    throw error;
  }
  const result = await scheduleIfEnabled(updated);
  const withNotificationIds = await lifeItemsRepository.getItem(id);
  return { item: withNotificationIds ?? updated, notificationWarning: notificationService.describeScheduleWarning(result) };
}

export async function deleteItem(id: string): Promise<void> {
  const item = await lifeItemsRepository.getItem(id);
  if (item) await notificationService.cancelItemNotifications(item);
  await lifeItemsRepository.deleteItem(id);
}

export async function completeItem(id: string, note?: string): Promise<{ item: LifeItem; historyId: string; notificationWarning?: string }> {
  if (inFlightCompletions.has(id)) throw new AlreadyInFlightError(id);
  inFlightCompletions.add(id);
  try {
    const item = await lifeItemsRepository.getItem(id);
    if (!item) throw new Error(`life-items-service: item ${id} not found`);
    const completedAt = new Date().toISOString();
    const today = formatIsoDate(new Date());
    const next =
      item.recurrence === 'none'
        ? null
        : calculateNextDueDate({
            dueDate: item.dueDate,
            recurrence: item.recurrence,
            recurrenceMode: item.recurrenceMode,
            anchorDay: item.anchorDay,
            completedAt,
            today,
          });
    const { item: updated, history } = await lifeItemsRepository.applyCompletion(id, {
      scheduledDate: item.dueDate,
      completedAt,
      note,
      nextDueDate: next?.nextDueDate ?? null,
      nextAnchorDay: next?.nextAnchorDay ?? item.anchorDay,
      previousDueDate: item.dueDate,
      previousAnchorDay: item.anchorDay,
      previousCompletedAt: item.completedAt,
      previousLastCompletedAt: item.lastCompletedAt,
    });
    let result: ScheduleResult;
    if (next) {
      result = await rescheduleIfEnabled(updated);
    } else {
      // One-time completion: the item and its reminder rows stay in the DB
      // (for history/detail display), so clear their notification_id too —
      // otherwise they'd keep pointing at an OS notification that's gone.
      await notificationService.cancelItemNotificationsAndClear(updated, persistNotificationId);
      result = emptyScheduleResult();
    }
    return { item: updated, historyId: history.id, notificationWarning: notificationService.describeScheduleWarning(result) };
  } finally {
    inFlightCompletions.delete(id);
  }
}

export async function undoCompleteItem(historyId: string): Promise<{ item: LifeItem; notificationWarning?: string }> {
  const restored = await lifeItemsRepository.undoCompletion(historyId);
  const result = await rescheduleIfEnabled(restored);
  return { item: restored, notificationWarning: notificationService.describeScheduleWarning(result) };
}

export async function getCompletionHistory(itemId: string, limit?: number): Promise<CompletionHistoryEntry[]> {
  return lifeItemsRepository.getCompletionHistory(itemId, limit);
}

export async function updateReminderSchedule(itemId: string, daysBefore: number[]): Promise<{ reminders: LifeItemReminder[]; notificationWarning?: string }> {
  // Same ghost-notification hazard as updateItem: cancel with the OLD
  // reminders (real notification IDs) before replaceReminders deletes them.
  const existing = await lifeItemsRepository.getItem(itemId);
  if (existing) await notificationService.cancelItemNotifications(existing);
  let reminders: LifeItemReminder[];
  try {
    reminders = await lifeItemsRepository.replaceReminders(itemId, daysBefore);
  } catch (error) {
    await restoreNotificationsAfterFailedWrite(existing, 'updateReminderSchedule');
    throw error;
  }
  const item = await lifeItemsRepository.getItem(itemId);
  const result = item ? await scheduleIfEnabled(item) : emptyScheduleResult();
  return { reminders, notificationWarning: notificationService.describeScheduleWarning(result) };
}

export async function getNotificationsEnabled(): Promise<boolean> {
  // Default OFF: a fresh install has never asked for (or been granted)
  // notification permission, so the switch must not silently claim ON.
  return lifeItemsRepository.getSetting('notifications_enabled', false);
}

export async function setNotificationsEnabled(enabled: boolean): Promise<{ notificationWarning?: string }> {
  await lifeItemsRepository.setSetting('notifications_enabled', enabled);
  const items = await lifeItemsRepository.listItems();
  if (enabled) {
    const results: ScheduleResult[] = [];
    for (const item of items) {
      if (shouldScheduleNotifications(true, item.completedAt)) {
        results.push(await notificationService.rescheduleItemNotifications(item, persistNotificationId));
      }
    }
    // The user's intent (turn notifications on) is still honored even if
    // some items couldn't be scheduled — the switch stays ON, but they're
    // told which reminders need attention.
    return { notificationWarning: notificationService.describeEnableWarning(mergeScheduleResults(...results)) };
  }
  await notificationService.cancelAllTracked(items, persistNotificationId);
  return {};
}

export async function syncNotificationsOnce(): Promise<void> {
  const enabled = await getNotificationsEnabled();
  if (!enabled) return;
  const items = await lifeItemsRepository.listItems();
  await notificationService.syncNotifications(items, persistNotificationId);
}

export async function getOnboardingCompleted(): Promise<boolean> {
  return lifeItemsRepository.getSetting('onboarding_completed', false);
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  await lifeItemsRepository.setSetting('onboarding_completed', completed);
}

export { AlreadyInFlightError };
