import { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/features/database/database';
import { resolveAnchorDayOnUpdate, resolveUndoState } from '@/features/life-items/date-utils';
import { createId } from '@/features/life-items/id';
import { LifeItemsRepository } from '@/features/life-items/life-items-repository-types';
import { createSeedItems } from '@/features/life-items/life-items-seed';
import { readLegacySnapshot, renameLegacySnapshotAfterMigration } from '@/features/life-items/life-items-storage.native';
import { CompletionHistoryEntry, LifeItem, LifeItemReminder, UpdateLifeItemInput } from '@/features/life-items/life-items-types';

type LifeItemRow = {
  id: string;
  title: string;
  category: string;
  due_date: string;
  anchor_day: number;
  recurrence: string;
  recurrence_mode: string;
  note: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  last_completed_at: string | null;
};

type ReminderRow = { id: string; item_id: string; days_before: number; notification_id: string | null };
type HistoryRow = {
  id: string;
  item_id: string;
  scheduled_date: string;
  completed_at: string;
  note: string | null;
  previous_due_date: string | null;
  previous_anchor_day: number | null;
  previous_completed_at: string | null;
  previous_last_completed_at: string | null;
};
type SettingRow = { value: string };

function mapReminderRow(row: ReminderRow): LifeItemReminder {
  return { id: row.id, daysBefore: row.days_before, notificationId: row.notification_id };
}

function mapHistoryRow(row: HistoryRow): CompletionHistoryEntry {
  return {
    id: row.id,
    itemId: row.item_id,
    scheduledDate: row.scheduled_date,
    completedAt: row.completed_at,
    note: row.note,
    previousDueDate: row.previous_due_date,
    previousAnchorDay: row.previous_anchor_day,
    previousCompletedAt: row.previous_completed_at,
    previousLastCompletedAt: row.previous_last_completed_at,
  };
}

async function mapItemRow(db: SQLiteDatabase, row: LifeItemRow): Promise<LifeItem> {
  const reminderRows = await db.getAllAsync<ReminderRow>('SELECT * FROM reminders WHERE item_id = ? ORDER BY days_before DESC', row.id);
  return {
    id: row.id,
    title: row.title,
    category: row.category as LifeItem['category'],
    dueDate: row.due_date,
    anchorDay: row.anchor_day,
    recurrence: row.recurrence as LifeItem['recurrence'],
    recurrenceMode: row.recurrence_mode as LifeItem['recurrenceMode'],
    note: row.note,
    reminders: reminderRows.map(mapReminderRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    lastCompletedAt: row.last_completed_at,
  };
}

async function getItemById(db: SQLiteDatabase, id: string): Promise<LifeItem | null> {
  const row = await db.getFirstAsync<LifeItemRow>('SELECT * FROM life_items WHERE id = ?', id);
  return row ? mapItemRow(db, row) : null;
}

async function getSettingValue<T>(db: SQLiteDatabase, key: string, fallback: T): Promise<T> {
  const row = await db.getFirstAsync<SettingRow>('SELECT value FROM app_settings WHERE key = ?', key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

async function setSettingValue(db: SQLiteDatabase, key: string, value: unknown): Promise<void> {
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}

async function insertItemWithReminders(db: SQLiteDatabase, item: LifeItem): Promise<void> {
  await db.runAsync(
    `INSERT INTO life_items
      (id, title, category, due_date, anchor_day, recurrence, recurrence_mode, note, created_at, updated_at, completed_at, last_completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.title,
    item.category,
    item.dueDate,
    item.anchorDay,
    item.recurrence,
    item.recurrenceMode,
    item.note,
    item.createdAt,
    item.updatedAt,
    item.completedAt,
    item.lastCompletedAt,
  );
  for (const reminder of item.reminders) {
    await db.runAsync('INSERT INTO reminders (id, item_id, days_before, notification_id) VALUES (?, ?, ?, ?)', reminder.id, item.id, reminder.daysBefore, reminder.notificationId);
  }
}

/**
 * One-time, retry-on-failure migration from the old single-JSON-blob
 * storage into SQLite. Never deletes the legacy file — only renames it
 * after a verified-successful transactional import. See plan §"JSON →
 * SQLite migration" for the full state-machine rationale.
 */
async function migrateLegacyDataIfNeeded(db: SQLiteDatabase): Promise<void> {
  const status = await getSettingValue<'done' | 'not_needed' | 'failed' | 'none'>(db, 'legacy_migration_status', 'none');
  if (status === 'done' || status === 'not_needed') return;

  const legacy = await readLegacySnapshot();
  if (!legacy || legacy.items.length === 0) {
    await setSettingValue(db, 'legacy_migration_status', 'not_needed');
    return;
  }

  try {
    await db.withTransactionAsync(async () => {
      for (const old of legacy.items) {
        const anchorDay = Number(old.dueDate.split('-')[2]) || 1;
        const item: LifeItem = {
          id: old.id,
          title: old.title,
          category: old.category as LifeItem['category'],
          dueDate: old.dueDate,
          anchorDay,
          recurrence: old.recurrence as LifeItem['recurrence'],
          recurrenceMode: 'fixed_schedule',
          note: old.note,
          reminders: [{ id: createId('reminder'), daysBefore: old.reminderDays, notificationId: null }],
          createdAt: old.createdAt,
          updatedAt: old.createdAt,
          completedAt: old.completedAt,
          lastCompletedAt: old.lastCompletedAt,
        };
        await insertItemWithReminders(db, item);
      }
    });
    await setSettingValue(db, 'legacy_migration_status', 'done');
    await setSettingValue(db, 'items_seeded', true);
    await renameLegacySnapshotAfterMigration();
  } catch (error) {
    console.error('[life-items] legacy JSON migration failed, will retry next launch', error);
    await setSettingValue(db, 'legacy_migration_status', 'failed');
  }
}

async function seedIfEmpty(db: SQLiteDatabase): Promise<void> {
  const alreadySeeded = await getSettingValue(db, 'items_seeded', false);
  if (alreadySeeded) return;
  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM life_items');
  if ((countRow?.count ?? 0) > 0) {
    await setSettingValue(db, 'items_seeded', true);
    return;
  }
  await db.withTransactionAsync(async () => {
    for (const item of createSeedItems()) {
      await insertItemWithReminders(db, item);
    }
  });
  await setSettingValue(db, 'items_seeded', true);
}

let initialized = false;

export const lifeItemsRepository: LifeItemsRepository = {
  async init() {
    if (initialized) return;
    const db = await getDatabase();
    await migrateLegacyDataIfNeeded(db);
    await seedIfEmpty(db);
    initialized = true;
  },

  async listItems() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<LifeItemRow>('SELECT * FROM life_items ORDER BY due_date ASC');
    const items: LifeItem[] = [];
    for (const row of rows) items.push(await mapItemRow(db, row));
    return items;
  },

  async getItem(id) {
    const db = await getDatabase();
    return getItemById(db, id);
  },

  async createItem(input) {
    const db = await getDatabase();
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
    await db.withTransactionAsync(async () => {
      await insertItemWithReminders(db, item);
    });
    return item;
  },

  async updateItem(id, patch: UpdateLifeItemInput) {
    const db = await getDatabase();
    const existing = await getItemById(db, id);
    if (!existing) throw new Error(`life-items-repository.native: item ${id} not found`);
    const dueDate = patch.dueDate ?? existing.dueDate;
    const anchorDay = resolveAnchorDayOnUpdate(existing.dueDate, existing.anchorDay, patch.dueDate);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE life_items SET title=?, category=?, due_date=?, anchor_day=?, recurrence=?, recurrence_mode=?, note=?, updated_at=? WHERE id=?`,
        patch.title ?? existing.title,
        patch.category ?? existing.category,
        dueDate,
        anchorDay,
        patch.recurrence ?? existing.recurrence,
        patch.recurrenceMode ?? existing.recurrenceMode,
        patch.note ?? existing.note,
        new Date().toISOString(),
        id,
      );
      if (patch.reminderDays) {
        await db.runAsync('DELETE FROM reminders WHERE item_id = ?', id);
        for (const daysBefore of patch.reminderDays) {
          await db.runAsync('INSERT INTO reminders (id, item_id, days_before, notification_id) VALUES (?, ?, ?, NULL)', createId('reminder'), id, daysBefore);
        }
      }
    });
    return (await getItemById(db, id))!;
  },

  async deleteItem(id) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM life_items WHERE id = ?', id);
  },

  async applyCompletion(itemId, args) {
    const db = await getDatabase();
    const historyId = createId('history');
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO completion_history
          (id, item_id, scheduled_date, completed_at, note, previous_due_date, previous_anchor_day, previous_completed_at, previous_last_completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        historyId,
        itemId,
        args.scheduledDate,
        args.completedAt,
        args.note ?? null,
        args.previousDueDate,
        args.previousAnchorDay,
        args.previousCompletedAt,
        args.previousLastCompletedAt,
      );
      if (args.nextDueDate) {
        await db.runAsync(
          'UPDATE life_items SET due_date=?, anchor_day=?, last_completed_at=?, updated_at=? WHERE id=?',
          args.nextDueDate,
          args.nextAnchorDay,
          args.completedAt,
          args.completedAt,
          itemId,
        );
      } else {
        await db.runAsync(
          'UPDATE life_items SET completed_at=?, last_completed_at=?, updated_at=? WHERE id=?',
          args.completedAt,
          args.completedAt,
          args.completedAt,
          itemId,
        );
      }
    });
    const item = await getItemById(db, itemId);
    if (!item) throw new Error(`life-items-repository.native: item ${itemId} not found after completion`);
    return {
      item,
      history: {
        id: historyId,
        itemId,
        scheduledDate: args.scheduledDate,
        completedAt: args.completedAt,
        note: args.note ?? null,
        previousDueDate: args.previousDueDate,
        previousAnchorDay: args.previousAnchorDay,
        previousCompletedAt: args.previousCompletedAt,
        previousLastCompletedAt: args.previousLastCompletedAt,
      },
    };
  },

  async undoCompletion(historyId) {
    const db = await getDatabase();
    const history = await db.getFirstAsync<HistoryRow>('SELECT * FROM completion_history WHERE id = ?', historyId);
    if (!history) throw new Error(`life-items-repository.native: history ${historyId} not found`);
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM completion_history WHERE id = ?', historyId);
      const remaining = await db.getFirstAsync<{ completed_at: string }>(
        'SELECT completed_at FROM completion_history WHERE item_id = ? ORDER BY completed_at DESC LIMIT 1',
        history.item_id,
      );
      const state = resolveUndoState(
        {
          scheduledDate: history.scheduled_date,
          previousDueDate: history.previous_due_date,
          previousAnchorDay: history.previous_anchor_day,
          previousCompletedAt: history.previous_completed_at,
          previousLastCompletedAt: history.previous_last_completed_at,
        },
        remaining?.completed_at ?? null,
      );
      await db.runAsync(
        'UPDATE life_items SET due_date=?, anchor_day=?, completed_at=?, last_completed_at=?, updated_at=? WHERE id=?',
        state.dueDate,
        state.anchorDay,
        state.completedAt,
        state.lastCompletedAt,
        new Date().toISOString(),
        history.item_id,
      );
    });
    const item = await getItemById(db, history.item_id);
    if (!item) throw new Error(`life-items-repository.native: item ${history.item_id} not found after undo`);
    return item;
  },

  async getCompletionHistory(itemId, limit) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<HistoryRow>('SELECT * FROM completion_history WHERE item_id = ? ORDER BY completed_at DESC', itemId);
    const entries = rows.map(mapHistoryRow);
    return typeof limit === 'number' ? entries.slice(0, limit) : entries;
  },

  async replaceReminders(itemId, daysBefore) {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM reminders WHERE item_id = ?', itemId);
      for (const days of daysBefore) {
        await db.runAsync('INSERT INTO reminders (id, item_id, days_before, notification_id) VALUES (?, ?, ?, NULL)', createId('reminder'), itemId, days);
      }
    });
    const rows = await db.getAllAsync<ReminderRow>('SELECT * FROM reminders WHERE item_id = ? ORDER BY days_before DESC', itemId);
    return rows.map(mapReminderRow);
  },

  async setReminderNotificationId(reminderId, notificationId) {
    const db = await getDatabase();
    await db.runAsync('UPDATE reminders SET notification_id = ? WHERE id = ?', notificationId, reminderId);
  },

  async getSetting(key, fallback) {
    const db = await getDatabase();
    return getSettingValue(db, key, fallback);
  },

  async setSetting(key, value) {
    const db = await getDatabase();
    await setSettingValue(db, key, value);
  },
};
