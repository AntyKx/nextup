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

const persistNotificationId = (reminderId: string, notificationId: string | null) =>
  lifeItemsRepository.setReminderNotificationId(reminderId, notificationId);

class AlreadyInFlightError extends Error {
  constructor(id: string) {
    super(`life-items-service: completeItem already in flight for ${id}`);
  }
}

const inFlightCompletions = new Set<string>();

export async function init(): Promise<LifeItem[]> {
  await lifeItemsRepository.init();
  return lifeItemsRepository.listItems();
}

export async function listItems(): Promise<LifeItem[]> {
  return lifeItemsRepository.listItems();
}

export async function addItem(input: NewLifeItemInput): Promise<LifeItem> {
  const anchorDay = parseLocalDate(input.dueDate).getDate();
  const item = await lifeItemsRepository.createItem({ ...input, anchorDay });
  await notificationService.scheduleItemNotifications(item, persistNotificationId);
  const withNotificationIds = await lifeItemsRepository.getItem(item.id);
  return withNotificationIds ?? item;
}

export async function updateItem(id: string, patch: UpdateLifeItemInput): Promise<LifeItem> {
  const updated = await lifeItemsRepository.updateItem(id, patch);
  if (!updated.completedAt) await notificationService.rescheduleItemNotifications(updated, persistNotificationId);
  const withNotificationIds = await lifeItemsRepository.getItem(id);
  return withNotificationIds ?? updated;
}

export async function deleteItem(id: string): Promise<void> {
  const item = await lifeItemsRepository.getItem(id);
  if (item) await notificationService.cancelItemNotifications(item);
  await lifeItemsRepository.deleteItem(id);
}

export async function completeItem(id: string, note?: string): Promise<{ item: LifeItem; historyId: string }> {
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
    });
    if (next) await notificationService.rescheduleItemNotifications(updated, persistNotificationId);
    else await notificationService.cancelItemNotifications(updated);
    return { item: updated, historyId: history.id };
  } finally {
    inFlightCompletions.delete(id);
  }
}

export async function undoCompleteItem(historyId: string): Promise<LifeItem> {
  const restored = await lifeItemsRepository.undoCompletion(historyId);
  await notificationService.rescheduleItemNotifications(restored, persistNotificationId);
  return restored;
}

export async function getCompletionHistory(itemId: string, limit?: number): Promise<CompletionHistoryEntry[]> {
  return lifeItemsRepository.getCompletionHistory(itemId, limit);
}

export async function updateReminderSchedule(itemId: string, daysBefore: number[]): Promise<LifeItemReminder[]> {
  const reminders = await lifeItemsRepository.replaceReminders(itemId, daysBefore);
  const item = await lifeItemsRepository.getItem(itemId);
  if (item && !item.completedAt) await notificationService.rescheduleItemNotifications(item, persistNotificationId);
  return reminders;
}

export async function getNotificationsEnabled(): Promise<boolean> {
  return lifeItemsRepository.getSetting('notifications_enabled', true);
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await lifeItemsRepository.setSetting('notifications_enabled', enabled);
  const items = await lifeItemsRepository.listItems();
  if (enabled) {
    for (const item of items) {
      if (!item.completedAt) await notificationService.rescheduleItemNotifications(item, persistNotificationId);
    }
  } else {
    await notificationService.cancelAllTracked(items, persistNotificationId);
  }
}

export async function syncNotificationsOnce(): Promise<void> {
  const enabled = await getNotificationsEnabled();
  if (!enabled) return;
  const items = await lifeItemsRepository.listItems();
  await notificationService.syncNotifications(items, persistNotificationId);
}

export { AlreadyInFlightError };
