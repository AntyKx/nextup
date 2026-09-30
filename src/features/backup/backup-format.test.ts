/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CompletionHistoryEntry, LifeItem } from '../life-items/life-items-types';
import { backupFileName, buildBackup, describeImportResult, parseBackup, planImport } from './backup-format';

function makeItem(overrides: Partial<LifeItem> = {}): LifeItem {
  return {
    id: 'item-1',
    title: '護照',
    category: 'document',
    dueDate: '2027-03-15',
    anchorDay: 15,
    recurrence: 'none',
    recurrenceMode: 'fixed_schedule',
    note: '',
    reminders: [
      { id: 'reminder-a', daysBefore: 30, notificationId: 'os-123' },
      { id: 'reminder-b', daysBefore: 90, notificationId: null },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    lastCompletedAt: null,
    ...overrides,
  };
}

function makeHistory(overrides: Partial<CompletionHistoryEntry> = {}): CompletionHistoryEntry {
  return {
    id: 'history-1',
    itemId: 'item-1',
    scheduledDate: '2026-03-15',
    completedAt: '2026-03-14T10:00:00.000Z',
    note: null,
    previousDueDate: '2026-03-15',
    previousAnchorDay: 15,
    previousCompletedAt: null,
    previousLastCompletedAt: null,
    ...overrides,
  };
}

function exportJson(items: LifeItem[], history: CompletionHistoryEntry[] = []): string {
  return JSON.stringify(buildBackup({ items, completionHistory: history, exportedAt: '2026-09-30T01:00:00.000Z', appVersion: '0.5.0' }));
}

test('buildBackup: stores reminders as plain days — no device-local reminder or OS notification IDs', () => {
  const backup = buildBackup({ items: [makeItem()], completionHistory: [], exportedAt: 'x', appVersion: '0.5.0' });
  assert.deepEqual(backup.items[0].reminderDays, [90, 30]);
  const serialized = JSON.stringify(backup);
  assert.ok(!serialized.includes('os-123'));
  assert.ok(!serialized.includes('reminder-a'));
});

test('parseBackup: round-trips an export exactly', () => {
  const history = [makeHistory()];
  const result = parseBackup(exportJson([makeItem()], history));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.backup.items.length, 1);
  assert.equal(result.backup.items[0].title, '護照');
  assert.deepEqual(result.backup.items[0].reminderDays, [90, 30]);
  assert.deepEqual(result.backup.completionHistory, history);
});

test('parseBackup: rejects something that is not a NextUp backup', () => {
  assert.deepEqual(parseBackup('not json'), { ok: false, error: '這不是 NextUp 的備份檔' });
  assert.deepEqual(parseBackup('{"hello":"world"}'), { ok: false, error: '這不是 NextUp 的備份檔' });
  assert.deepEqual(parseBackup('[]'), { ok: false, error: '這不是 NextUp 的備份檔' });
});

test('parseBackup: a backup from a newer format asks the user to update instead of guessing', () => {
  const newer = { ...JSON.parse(exportJson([makeItem()])), formatVersion: 99 };
  assert.deepEqual(parseBackup(JSON.stringify(newer)), { ok: false, error: '這個備份檔來自較新版本的 NextUp，請先更新 App' });
});

test('parseBackup: one invalid row rejects the whole file (all-or-nothing)', () => {
  const corrupt = (mutate: (backup: any) => void) => {
    const backup = JSON.parse(exportJson([makeItem(), makeItem({ id: 'item-2' })], [makeHistory()]));
    mutate(backup);
    return parseBackup(JSON.stringify(backup));
  };
  const corrupted = { ok: false, error: '備份檔內容不完整或已損毀' };
  assert.deepEqual(corrupt((b) => (b.items[1].dueDate = '2026-02-30')), corrupted);
  assert.deepEqual(corrupt((b) => (b.items[1].category = 'pets')), corrupted);
  assert.deepEqual(corrupt((b) => (b.items[1].anchorDay = 0)), corrupted);
  assert.deepEqual(corrupt((b) => (b.items[1].reminderDays = [7, 7])), corrupted);
  assert.deepEqual(corrupt((b) => (b.items[1].reminderDays = [-1])), corrupted);
  assert.deepEqual(corrupt((b) => delete b.items[1].title), corrupted);
  assert.deepEqual(corrupt((b) => (b.items[1].id = 'item-1')), corrupted);
  assert.deepEqual(corrupt((b) => (b.completionHistory[0].itemId = 'missing')), corrupted);
  assert.deepEqual(corrupt((b) => (b.completionHistory[0].completedAt = 'yesterday')), corrupted);
  assert.deepEqual(corrupt((b) => delete b.completionHistory), corrupted);
});

test('parseBackup: drops unknown extra fields instead of carrying them into the database', () => {
  const backup = JSON.parse(exportJson([makeItem()]));
  backup.items[0].injected = 'x';
  const result = parseBackup(JSON.stringify(backup));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal('injected' in result.backup.items[0], false);
});

test('planImport: skips items already on this device, along with their history', () => {
  const parsed = parseBackup(
    exportJson([makeItem(), makeItem({ id: 'item-2', title: '汽車保險' })], [makeHistory(), makeHistory({ id: 'history-2', itemId: 'item-2' })]),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const plan = planImport(parsed.backup, new Set(['item-1']));
  assert.deepEqual(plan.items.map((item) => item.id), ['item-2']);
  assert.deepEqual(plan.completionHistory.map((entry) => entry.id), ['history-2']);
  assert.equal(plan.skippedCount, 1);
});

test('planImport: re-importing the same file is a no-op', () => {
  const parsed = parseBackup(exportJson([makeItem()], [makeHistory()]));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const plan = planImport(parsed.backup, new Set(['item-1']));
  assert.equal(plan.items.length, 0);
  assert.equal(plan.completionHistory.length, 0);
  assert.equal(plan.skippedCount, 1);
});

test('backupFileName: uses the local calendar date', () => {
  assert.equal(backupFileName(new Date(2026, 8, 30, 23, 30)), 'nextup-backup-2026-09-30.json');
  assert.equal(backupFileName(new Date(2027, 0, 5)), 'nextup-backup-2027-01-05.json');
});

test('describeImportResult: distinct copy for each outcome', () => {
  assert.equal(describeImportResult(0, 0), '備份檔裡沒有任何事項');
  assert.equal(describeImportResult(0, 3), '這些事項都已經在這台裝置上了（3 項）');
  assert.equal(describeImportResult(4, 0), '已匯入 4 個事項');
  assert.equal(describeImportResult(4, 2), '已匯入 4 個事項，略過 2 個已存在的事項');
});
