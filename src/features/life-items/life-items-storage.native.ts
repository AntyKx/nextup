import { File, Paths } from 'expo-file-system';

import { AppSnapshot } from '@/features/life-items/life-items-types';

const snapshotFile = new File(Paths.document, 'nextup-snapshot.json');

export async function loadSnapshot(): Promise<AppSnapshot | null> {
  try {
    if (!snapshotFile.exists) return null;
    return JSON.parse(await snapshotFile.text()) as AppSnapshot;
  } catch {
    return null;
  }
}

export async function saveSnapshot(snapshot: AppSnapshot) {
  if (!snapshotFile.exists) snapshotFile.create({ intermediates: true });
  snapshotFile.write(JSON.stringify(snapshot));
}
