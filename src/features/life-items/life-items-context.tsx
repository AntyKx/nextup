import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { createSeedSnapshot } from '@/features/life-items/life-items-seed';
import { loadSnapshot, saveSnapshot } from '@/features/life-items/life-items-storage';
import { AppSnapshot, LifeItem, NewLifeItem } from '@/features/life-items/life-items-types';
import { advanceDueDate } from '@/features/life-items/life-items-utils';

type LifeItemsContextValue = {
  items: LifeItem[];
  isLoading: boolean;
  addItem: (item: NewLifeItem) => Promise<void>;
  completeItem: (id: string) => Promise<void>;
};

const LifeItemsContext = createContext<LifeItemsContextValue | null>(null);

export function LifeItemsProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<AppSnapshot>({ version: 1, items: [] });
  const [isLoading, setIsLoading] = useState(true);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    let active = true;
    loadSnapshot().then(async (stored) => {
      if (!active) return;
      const next = stored ?? createSeedSnapshot();
      snapshotRef.current = next;
      setSnapshot(next);
      setIsLoading(false);
      if (!stored) await saveSnapshot(next);
    });
    return () => { active = false; };
  }, []);

  const commit = useCallback(async (updater: (current: AppSnapshot) => AppSnapshot) => {
    const nextSnapshot = updater(snapshotRef.current);
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
    await saveSnapshot(nextSnapshot);
  }, []);

  const addItem = useCallback(async (item: NewLifeItem) => {
    const now = new Date().toISOString();
    const newItem: LifeItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      completedAt: null,
      lastCompletedAt: null,
    };
    await commit((current) => ({ ...current, items: [...current.items, newItem] }));
  }, [commit]);

  const completeItem = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    await commit((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== id) return item;
        if (item.recurrence === 'none') return { ...item, completedAt: now, lastCompletedAt: now };
        return { ...item, dueDate: advanceDueDate(item.dueDate, item.recurrence), lastCompletedAt: now };
      }),
    }));
  }, [commit]);

  const value = useMemo(
    () => ({ items: snapshot.items, isLoading, addItem, completeItem }),
    [addItem, completeItem, isLoading, snapshot.items],
  );
  return <LifeItemsContext.Provider value={value}>{children}</LifeItemsContext.Provider>;
}

export function useLifeItems() {
  const value = useContext(LifeItemsContext);
  if (!value) throw new Error('useLifeItems must be used inside LifeItemsProvider');
  return value;
}
