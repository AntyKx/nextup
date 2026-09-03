import { File, Paths } from 'expo-file-system';

/**
 * Repurposed: this used to be the app's live persistence path (one JSON
 * blob). It now only ever READS the old file, once, so
 * `life-items-repository.native.ts` can migrate it into SQLite on first
 * launch after the v0.3 upgrade. Never write through this module again.
 */

export type LegacyLifeItem = {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  reminderDays: number;
  recurrence: string;
  note: string;
  createdAt: string;
  completedAt: string | null;
  lastCompletedAt: string | null;
};

export type LegacySnapshot = {
  version: 1;
  items: LegacyLifeItem[];
};

const snapshotFile = new File(Paths.document, 'nextup-snapshot.json');

export async function readLegacySnapshot(): Promise<LegacySnapshot | null> {
  try {
    if (!snapshotFile.exists) return null;
    const parsed = JSON.parse(await snapshotFile.text());
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) return null;
    return parsed as LegacySnapshot;
  } catch {
    return null;
  }
}

export async function renameLegacySnapshotAfterMigration(): Promise<void> {
  try {
    if (!snapshotFile.exists) return;
    await snapshotFile.move(new File(Paths.document, 'nextup-snapshot.migrated.json'));
  } catch (error) {
    console.error('[life-items] failed to rename legacy snapshot after migration', error);
  }
}
