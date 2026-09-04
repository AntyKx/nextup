import { resolveAnchorDayOnUpdate, resolveUndoState } from '@/features/life-items/date-utils';
import { createId } from '@/features/life-items/id';
import { LifeItemsRepository } from '@/features/life-items/life-items-repository-types';
import { createSeedItems } from '@/features/life-items/life-items-seed';
import { getLegacyBlob, getStoredBlob, getV2Blob, setStoredBlob, WebBlob } from '@/features/life-items/life-items-storage.web';
import { CompletionHistoryEntry, LifeItem, UpdateLifeItemInput } from '@/features/life-items/life-items-types';

let blob: WebBlob | null = null;

function emptyBlob(): WebBlob {
  return { version: 3, items: [], completionHistory: [], settings: {} };
}

function migrateLegacyBlob(): WebBlob {
  const legacy = getLegacyBlob();
  if (!legacy) return emptyBlob();
  const items: LifeItem[] = legacy.items.map((old) => ({
    id: old.id,
    title: old.title,
    category: old.category as LifeItem['category'],
    dueDate: old.dueDate,
    anchorDay: Number(old.dueDate.split('-')[2]),
    recurrence: old.recurrence as LifeItem['recurrence'],
    recurrenceMode: 'fixed_schedule',
    note: old.note,
    reminders: [{ id: createId('reminder'), daysBefore: old.reminderDays, notificationId: null }],
    createdAt: old.createdAt,
    updatedAt: old.createdAt,
    completedAt: old.completedAt,
    lastCompletedAt: old.lastCompletedAt,
  }));
  return { version: 3, items, completionHistory: [], settings: {} };
}

/** v2 history rows predate the previous-state snapshot — backfill with nulls so `resolveUndoState` takes the legacy fallback path. */
function upgradeV2Blob(): WebBlob | null {
  const v2 = getV2Blob();
  if (!v2) return null;
  return {
    version: 3,
    items: v2.items,
    completionHistory: v2.completionHistory.map((entry) => ({
      ...entry,
      previousDueDate: null,
      previousAnchorDay: null,
      previousCompletedAt: null,
      previousLastCompletedAt: null,
    })),
    settings: v2.settings,
  };
}

function requireBlob(): WebBlob {
  if (!blob) throw new Error('life-items-repository.web: init() must be called before use');
  return blob;
}

/**
 * Every mutation replaces `blob` (and whichever nested array/object it
 * touches) with a NEW reference rather than mutating in place. The context
 * compares state by reference, so an in-place mutation would leave React
 * unaware anything changed until the next full reload.
 */
async function commit(next: WebBlob): Promise<void> {
  blob = next;
  setStoredBlob(next);
}

export const lifeItemsRepository: LifeItemsRepository = {
  async init() {
    if (blob) return;
    const stored = getStoredBlob();
    if (stored) {
      blob = stored;
      return;
    }
    const upgraded = upgradeV2Blob();
    if (upgraded) {
      await commit(upgraded);
      return;
    }
    const migrated = migrateLegacyBlob();
    if (migrated.items.length === 0) migrated.items = createSeedItems();
    await commit(migrated);
  },

  async listItems() {
    return requireBlob().items;
  },

  async getItem(id) {
    return requireBlob().items.find((item) => item.id === id) ?? null;
  },

  async createItem(input) {
    const current = requireBlob();
    const now = new Date().toISOString();
    const item: LifeItem = {
      id: createId('item'),
      title: input.title,
      category: input.category,
      dueDate: input.dueDate,
      anchorDay: input.anchorDay,
      recurrence: input.recurrence,
      recurrenceMode: input.recurrenceMode,
      note: input.note,
      reminders: input.reminderDays.map((daysBefore) => ({ id: createId('reminder'), daysBefore, notificationId: null })),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      lastCompletedAt: null,
    };
    await commit({ ...current, items: [...current.items, item] });
    return item;
  },

  async updateItem(id, patch: UpdateLifeItemInput) {
    const current = requireBlob();
    const existing = current.items.find((item) => item.id === id);
    if (!existing) throw new Error(`life-items-repository.web: item ${id} not found`);
    const updated: LifeItem = {
      ...existing,
      title: patch.title ?? existing.title,
      category: patch.category ?? existing.category,
      dueDate: patch.dueDate ?? existing.dueDate,
      anchorDay: resolveAnchorDayOnUpdate(existing.dueDate, existing.anchorDay, patch.dueDate),
      recurrence: patch.recurrence ?? existing.recurrence,
      recurrenceMode: patch.recurrenceMode ?? existing.recurrenceMode,
      note: patch.note ?? existing.note,
      reminders: patch.reminderDays
        ? patch.reminderDays.map((daysBefore) => ({ id: createId('reminder'), daysBefore, notificationId: null }))
        : existing.reminders,
      updatedAt: new Date().toISOString(),
    };
    await commit({ ...current, items: current.items.map((item) => (item.id === id ? updated : item)) });
    return updated;
  },

  async deleteItem(id) {
    const current = requireBlob();
    await commit({
      ...current,
      items: current.items.filter((item) => item.id !== id),
      completionHistory: current.completionHistory.filter((entry) => entry.itemId !== id),
    });
  },

  async applyCompletion(itemId, args) {
    const current = requireBlob();
    const existing = current.items.find((item) => item.id === itemId);
    if (!existing) throw new Error(`life-items-repository.web: item ${itemId} not found`);
    const history: CompletionHistoryEntry = {
      id: createId('history'),
      itemId,
      scheduledDate: args.scheduledDate,
      completedAt: args.completedAt,
      note: args.note ?? null,
      previousDueDate: args.previousDueDate,
      previousAnchorDay: args.previousAnchorDay,
      previousCompletedAt: args.previousCompletedAt,
      previousLastCompletedAt: args.previousLastCompletedAt,
    };
    const updated: LifeItem = {
      ...existing,
      dueDate: args.nextDueDate ?? existing.dueDate,
      anchorDay: args.nextAnchorDay,
      completedAt: args.nextDueDate ? null : args.completedAt,
      lastCompletedAt: args.completedAt,
      updatedAt: args.completedAt,
    };
    await commit({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? updated : item)),
      completionHistory: [...current.completionHistory, history],
    });
    return { item: updated, history };
  },

  async undoCompletion(historyId) {
    const current = requireBlob();
    const history = current.completionHistory.find((entry) => entry.id === historyId);
    if (!history) throw new Error(`life-items-repository.web: history ${historyId} not found`);
    const existing = current.items.find((item) => item.id === history.itemId);
    if (!existing) throw new Error(`life-items-repository.web: item ${history.itemId} not found`);
    const remainingHistory = current.completionHistory.filter((entry) => entry.id !== historyId);
    const remainingForItem = remainingHistory
      .filter((entry) => entry.itemId === history.itemId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const state = resolveUndoState(
      {
        scheduledDate: history.scheduledDate,
        previousDueDate: history.previousDueDate,
        previousAnchorDay: history.previousAnchorDay,
        previousCompletedAt: history.previousCompletedAt,
        previousLastCompletedAt: history.previousLastCompletedAt,
      },
      remainingForItem[0]?.completedAt ?? null,
    );
    const restored: LifeItem = {
      ...existing,
      dueDate: state.dueDate,
      anchorDay: state.anchorDay,
      completedAt: state.completedAt,
      lastCompletedAt: state.lastCompletedAt,
      updatedAt: new Date().toISOString(),
    };
    await commit({
      ...current,
      items: current.items.map((item) => (item.id === history.itemId ? restored : item)),
      completionHistory: remainingHistory,
    });
    return restored;
  },

  async getCompletionHistory(itemId, limit) {
    const entries = requireBlob()
      .completionHistory.filter((entry) => entry.itemId === itemId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    return typeof limit === 'number' ? entries.slice(0, limit) : entries;
  },

  async replaceReminders(itemId, daysBefore) {
    const current = requireBlob();
    const existing = current.items.find((item) => item.id === itemId);
    if (!existing) throw new Error(`life-items-repository.web: item ${itemId} not found`);
    const reminders = daysBefore.map((days) => ({ id: createId('reminder'), daysBefore: days, notificationId: null }));
    const updated: LifeItem = { ...existing, reminders, updatedAt: new Date().toISOString() };
    await commit({ ...current, items: current.items.map((item) => (item.id === itemId ? updated : item)) });
    return reminders;
  },

  async setReminderNotificationId(reminderId, notificationId) {
    const current = requireBlob();
    let changed = false;
    const items = current.items.map((item) => {
      if (!item.reminders.some((reminder) => reminder.id === reminderId)) return item;
      changed = true;
      return {
        ...item,
        reminders: item.reminders.map((reminder) => (reminder.id === reminderId ? { ...reminder, notificationId } : reminder)),
      };
    });
    if (!changed) throw new Error(`life-items-repository.web: reminder ${reminderId} no longer exists`);
    await commit({ ...current, items });
  },

  async getSetting(key, fallback) {
    const value = requireBlob().settings[key];
    return value === undefined ? fallback : (value as typeof fallback);
  },

  async setSetting(key, value) {
    const current = requireBlob();
    await commit({ ...current, settings: { ...current.settings, [key]: value } });
  },
};
