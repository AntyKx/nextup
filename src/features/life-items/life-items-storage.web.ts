import { CompletionHistoryEntry, LifeItem } from '@/features/life-items/life-items-types';

/**
 * Low-level localStorage blob access for the web repository. Web
 * intentionally stays off SQLite (see plan) — one JSON blob is enough for
 * a browser preview build.
 */

const STORAGE_KEY = 'nextup.snapshot.v3';
const V2_STORAGE_KEY = 'nextup.snapshot.v2';
const LEGACY_STORAGE_KEY = 'nextup.snapshot.v1';

export type WebBlob = {
  version: 3;
  items: LifeItem[];
  completionHistory: CompletionHistoryEntry[];
  settings: Record<string, unknown>;
};

/** Schema before completion_history gained the previous-state snapshot (v0.3.1). */
export type V2WebBlob = {
  version: 2;
  items: LifeItem[];
  completionHistory: Omit<CompletionHistoryEntry, 'previousDueDate' | 'previousAnchorDay' | 'previousCompletedAt' | 'previousLastCompletedAt'>[];
  settings: Record<string, unknown>;
};

export type LegacyWebBlob = {
  version: 1;
  items: {
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
  }[];
};

export function getStoredBlob(): WebBlob | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WebBlob) : null;
  } catch {
    return null;
  }
}

export function setStoredBlob(blob: WebBlob) {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(blob));
}

export function getV2Blob(): V2WebBlob | null {
  try {
    const raw = globalThis.localStorage?.getItem(V2_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.items)) return null;
    return parsed as V2WebBlob;
  } catch {
    return null;
  }
}

export function getLegacyBlob(): LegacyWebBlob | null {
  try {
    const raw = globalThis.localStorage?.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) return null;
    return parsed as LegacyWebBlob;
  } catch {
    return null;
  }
}
