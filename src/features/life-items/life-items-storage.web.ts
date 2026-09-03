import { AppSnapshot } from '@/features/life-items/life-items-types';

const STORAGE_KEY = 'nextup.snapshot.v1';

export async function loadSnapshot(): Promise<AppSnapshot | null> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppSnapshot) : null;
  } catch {
    return null;
  }
}

export async function saveSnapshot(snapshot: AppSnapshot) {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
