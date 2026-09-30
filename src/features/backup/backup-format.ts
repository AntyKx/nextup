/**
 * Pure backup (export/import) format logic — no file-system, sharing or
 * React Native imports so it runs under plain Node tests (see
 * `backup-format.test.ts`). Reading/writing the actual file lives in
 * `backup-file.*.ts`; applying an import to the database lives in
 * `life-items-service.ts`.
 *
 * The file is meant to outlive this app version (it's what a user keeps in
 * their cloud drive when they change phones), so it deliberately does NOT
 * mirror the SQLite schema: reminders are stored as plain `reminderDays`
 * (reminder row IDs and OS notification IDs are device-local and meaningless
 * on another phone), and the whole thing is versioned via `formatVersion`.
 */

import { CompletionHistoryEntry, LifeItem } from '@/features/life-items/life-items-types';

export const BACKUP_FORMAT_VERSION = 1;
const BACKUP_APP_MARKER = 'nextup';

export type BackupItem = Omit<LifeItem, 'reminders'> & { reminderDays: number[] };

export type NextUpBackup = {
  app: typeof BACKUP_APP_MARKER;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  appVersion: string;
  items: BackupItem[];
  completionHistory: CompletionHistoryEntry[];
};

export type ParseBackupResult = { ok: true; backup: NextUpBackup } | { ok: false; error: string };

/** What the repository actually inserts — reminders carry days only; the repository mints fresh reminder IDs. */
export type ImportPlan = {
  items: BackupItem[];
  completionHistory: CompletionHistoryEntry[];
  skippedCount: number;
};

const CATEGORIES = ['document', 'vehicle', 'home', 'digital', 'money', 'travel'];
const RECURRENCES = ['none', 'monthly', 'quarterly', 'yearly'];
const RECURRENCE_MODES = ['fixed_schedule', 'from_completion'];

export function buildBackup(args: { items: LifeItem[]; completionHistory: CompletionHistoryEntry[]; exportedAt: string; appVersion: string }): NextUpBackup {
  return {
    app: BACKUP_APP_MARKER,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: args.exportedAt,
    appVersion: args.appVersion,
    items: args.items.map(({ reminders, ...item }) => ({
      ...item,
      reminderDays: [...new Set(reminders.map((reminder) => reminder.daysBefore))].sort((a, b) => b - a),
    })),
    completionHistory: args.completionHistory,
  };
}

/** `nextup-backup-2026-09-30.json` — the local date, so the name matches the day the user made it. */
export function backupFileName(now: Date): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `nextup-backup-${yyyy}-${mm}-${dd}.json`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** A real calendar date in yyyy-MM-dd (rejects 2026-02-30, which `new Date` would silently roll into March). */
function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function isValidItem(value: unknown): value is BackupItem {
  if (!isObject(value)) return false;
  const v = value;
  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.title) &&
    CATEGORIES.includes(v.category as string) &&
    isIsoDate(v.dueDate) &&
    Number.isInteger(v.anchorDay) &&
    (v.anchorDay as number) >= 1 &&
    (v.anchorDay as number) <= 31 &&
    RECURRENCES.includes(v.recurrence as string) &&
    RECURRENCE_MODES.includes(v.recurrenceMode as string) &&
    typeof v.note === 'string' &&
    Array.isArray(v.reminderDays) &&
    v.reminderDays.every((days) => Number.isInteger(days) && days >= 0) &&
    new Set(v.reminderDays).size === v.reminderDays.length &&
    isTimestamp(v.createdAt) &&
    isTimestamp(v.updatedAt) &&
    isNullableTimestamp(v.completedAt) &&
    isNullableTimestamp(v.lastCompletedAt)
  );
}

function isValidHistory(value: unknown): value is CompletionHistoryEntry {
  if (!isObject(value)) return false;
  const v = value;
  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.itemId) &&
    isIsoDate(v.scheduledDate) &&
    isTimestamp(v.completedAt) &&
    isNullableString(v.note) &&
    (v.previousDueDate === null || isIsoDate(v.previousDueDate)) &&
    (v.previousAnchorDay === null || (Number.isInteger(v.previousAnchorDay) && (v.previousAnchorDay as number) >= 1 && (v.previousAnchorDay as number) <= 31)) &&
    isNullableTimestamp(v.previousCompletedAt) &&
    isNullableTimestamp(v.previousLastCompletedAt)
  );
}

function pickItem(v: BackupItem): BackupItem {
  return {
    id: v.id,
    title: v.title,
    category: v.category,
    dueDate: v.dueDate,
    anchorDay: v.anchorDay,
    recurrence: v.recurrence,
    recurrenceMode: v.recurrenceMode,
    note: v.note,
    reminderDays: [...v.reminderDays],
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    completedAt: v.completedAt,
    lastCompletedAt: v.lastCompletedAt,
  };
}

function pickHistory(v: CompletionHistoryEntry): CompletionHistoryEntry {
  return {
    id: v.id,
    itemId: v.itemId,
    scheduledDate: v.scheduledDate,
    completedAt: v.completedAt,
    note: v.note,
    previousDueDate: v.previousDueDate,
    previousAnchorDay: v.previousAnchorDay,
    previousCompletedAt: v.previousCompletedAt,
    previousLastCompletedAt: v.previousLastCompletedAt,
  };
}

/**
 * All-or-nothing: one bad row rejects the whole file. A backup is supposed
 * to be an exact copy — silently importing "most of it" would leave the user
 * believing everything came back when it didn't. Errors are user-facing copy.
 */
export function parseBackup(raw: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: '這不是 NextUp 的備份檔' };
  }
  if (!isObject(parsed) || parsed.app !== BACKUP_APP_MARKER || typeof parsed.formatVersion !== 'number') {
    return { ok: false, error: '這不是 NextUp 的備份檔' };
  }
  if (parsed.formatVersion > BACKUP_FORMAT_VERSION) {
    return { ok: false, error: '這個備份檔來自較新版本的 NextUp，請先更新 App' };
  }
  if (parsed.formatVersion !== BACKUP_FORMAT_VERSION || !Array.isArray(parsed.items) || !Array.isArray(parsed.completionHistory)) {
    return { ok: false, error: '備份檔內容不完整或已損毀' };
  }
  if (!parsed.items.every(isValidItem) || !parsed.completionHistory.every(isValidHistory)) {
    return { ok: false, error: '備份檔內容不完整或已損毀' };
  }
  const items = parsed.items.map(pickItem);
  const completionHistory = parsed.completionHistory.map(pickHistory);
  const itemIds = new Set(items.map((item) => item.id));
  const historyIds = new Set(completionHistory.map((entry) => entry.id));
  if (itemIds.size !== items.length || historyIds.size !== completionHistory.length) {
    return { ok: false, error: '備份檔內容不完整或已損毀' };
  }
  if (!completionHistory.every((entry) => itemIds.has(entry.itemId))) {
    return { ok: false, error: '備份檔內容不完整或已損毀' };
  }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP_MARKER,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
      appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : '',
      items,
      completionHistory,
    },
  };
}

/**
 * Merge, never overwrite: an item whose ID already exists on this device is
 * skipped (along with its history) so importing can never destroy data the
 * user has now — re-importing the same file twice is a harmless no-op.
 */
export function planImport(backup: NextUpBackup, existingItemIds: ReadonlySet<string>): ImportPlan {
  const items = backup.items.filter((item) => !existingItemIds.has(item.id));
  const importedIds = new Set(items.map((item) => item.id));
  return {
    items,
    completionHistory: backup.completionHistory.filter((entry) => importedIds.has(entry.itemId)),
    skippedCount: backup.items.length - items.length,
  };
}

/** Reminder rows get fresh IDs on this device, and no OS notification yet — the service schedules those after the import commits. */
export function backupItemToLifeItem({ reminderDays, ...item }: BackupItem, createReminderId: () => string): LifeItem {
  return {
    ...item,
    reminders: reminderDays.map((daysBefore) => ({ id: createReminderId(), daysBefore, notificationId: null })),
  };
}

export function describeImportResult(importedCount: number, skippedCount: number): string {
  if (importedCount === 0 && skippedCount === 0) return '備份檔裡沒有任何事項';
  if (importedCount === 0) return `這些事項都已經在這台裝置上了（${skippedCount} 項）`;
  if (skippedCount === 0) return `已匯入 ${importedCount} 個事項`;
  return `已匯入 ${importedCount} 個事項，略過 ${skippedCount} 個已存在的事項`;
}
