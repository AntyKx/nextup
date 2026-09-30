import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { showSnackbar } from '@/components/snackbar';
import { appVersion } from '@/constants/app-info';
import * as lifeItemsService from '@/features/life-items/life-items-service';
import { CompletionHistoryEntry, LifeItem, LifeItemReminder, NewLifeItemInput, UpdateLifeItemInput } from '@/features/life-items/life-items-types';
import { DEFAULT_NOTIFICATION_TIME, NotificationTime } from '@/features/notifications/notification-policy';

type LifeItemsContextValue = {
  items: LifeItem[];
  isLoading: boolean;
  error: string | null;
  notificationsEnabled: boolean;
  notificationTime: NotificationTime;
  /** null while still loading — callers should treat that the same as "not decided yet", not as false. */
  onboardingCompleted: boolean | null;
  addItem: (item: NewLifeItemInput) => Promise<void>;
  updateItem: (id: string, patch: UpdateLifeItemInput) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  completeItem: (id: string) => Promise<{ historyId: string; notificationWarning?: string } | null>;
  undoCompleteItem: (historyId: string) => Promise<void>;
  getCompletionHistory: (itemId: string, limit?: number) => Promise<CompletionHistoryEntry[]>;
  updateReminderSchedule: (itemId: string, daysBefore: number[]) => Promise<LifeItemReminder[]>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setNotificationTime: (time: NotificationTime) => Promise<void>;
  exportBackup: () => Promise<{ json: string; itemCount: number }>;
  /** Throws `InvalidBackupError` (user-facing message) for a bad file; returns the result copy otherwise. */
  importBackup: (raw: string) => Promise<string>;
};

const LifeItemsContext = createContext<LifeItemsContextValue | null>(null);

export function LifeItemsProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<LifeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean | null>(null);
  const [notificationTime, setNotificationTimeState] = useState<NotificationTime>(DEFAULT_NOTIFICATION_TIME);

  const refresh = useCallback(async () => {
    const next = await lifeItemsService.listItems();
    setItems(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const initial = await lifeItemsService.init();
        if (!active) return;
        setItems(initial);
        setNotificationsEnabledState(await lifeItemsService.getNotificationsEnabled());
        setNotificationTimeState(await lifeItemsService.getNotificationTime());
        setOnboardingCompletedState(await lifeItemsService.getOnboardingCompleted());
        setIsLoading(false);
        await lifeItemsService.syncNotificationsOnce();
      } catch (err) {
        console.error('[life-items] failed to initialize', err);
        if (active) {
          setError('資料載入失敗，請重新開啟 App。');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const addItem = useCallback(
    async (item: NewLifeItemInput) => {
      try {
        const { notificationWarning } = await lifeItemsService.addItem(item);
        await refresh();
        if (notificationWarning) showSnackbar({ message: notificationWarning });
      } catch (err) {
        console.error('[life-items] addItem failed', err);
        setError('新增失敗，請再試一次。');
        throw err;
      }
    },
    [refresh],
  );

  const updateItem = useCallback(
    async (id: string, patch: UpdateLifeItemInput) => {
      try {
        const { notificationWarning } = await lifeItemsService.updateItem(id, patch);
        await refresh();
        if (notificationWarning) showSnackbar({ message: notificationWarning });
      } catch (err) {
        console.error('[life-items] updateItem failed', err);
        setError('儲存失敗，請再試一次。');
        throw err;
      }
    },
    [refresh],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      try {
        await lifeItemsService.deleteItem(id);
        await refresh();
      } catch (err) {
        console.error('[life-items] deleteItem failed', err);
        setError('刪除失敗，請再試一次。');
        throw err;
      }
    },
    [refresh],
  );

  const completeItem = useCallback(
    async (id: string) => {
      try {
        const { historyId, notificationWarning } = await lifeItemsService.completeItem(id);
        await refresh();
        return { historyId, notificationWarning };
      } catch (err) {
        if (err instanceof lifeItemsService.AlreadyInFlightError) return null;
        console.error('[life-items] completeItem failed', err);
        setError('完成失敗，請再試一次。');
        throw err;
      }
    },
    [refresh],
  );

  const undoCompleteItem = useCallback(
    async (historyId: string) => {
      try {
        const { notificationWarning } = await lifeItemsService.undoCompleteItem(historyId);
        await refresh();
        if (notificationWarning) showSnackbar({ message: `已復原。${notificationWarning}` });
      } catch (err) {
        console.error('[life-items] undoCompleteItem failed', err);
        setError('復原失敗，請再試一次。');
        throw err;
      }
    },
    [refresh],
  );

  const getCompletionHistory = useCallback((itemId: string, limit?: number) => lifeItemsService.getCompletionHistory(itemId, limit), []);

  const updateReminderSchedule = useCallback(
    async (itemId: string, daysBefore: number[]) => {
      const { reminders, notificationWarning } = await lifeItemsService.updateReminderSchedule(itemId, daysBefore);
      await refresh();
      if (notificationWarning) showSnackbar({ message: notificationWarning });
      return reminders;
    },
    [refresh],
  );

  const setNotificationsEnabled = useCallback(async (enabled: boolean) => {
    const { notificationWarning } = await lifeItemsService.setNotificationsEnabled(enabled);
    setNotificationsEnabledState(enabled);
    if (notificationWarning) showSnackbar({ message: notificationWarning });
  }, []);

  const setOnboardingCompleted = useCallback(async (completed: boolean) => {
    await lifeItemsService.setOnboardingCompleted(completed);
    setOnboardingCompletedState(completed);
  }, []);

  const setNotificationTime = useCallback(async (time: NotificationTime) => {
    const { notificationWarning } = await lifeItemsService.setNotificationTime(time);
    setNotificationTimeState(time);
    if (notificationWarning) showSnackbar({ message: notificationWarning });
  }, []);

  const exportBackup = useCallback(() => lifeItemsService.exportBackup(appVersion), []);

  const importBackup = useCallback(
    async (raw: string) => {
      const { message, importedCount, notificationWarning } = await lifeItemsService.importBackup(raw);
      if (importedCount > 0) await refresh();
      return notificationWarning ? `${message}。${notificationWarning}` : message;
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      items,
      isLoading,
      error,
      notificationsEnabled,
      notificationTime,
      onboardingCompleted,
      addItem,
      updateItem,
      deleteItem,
      completeItem,
      undoCompleteItem,
      getCompletionHistory,
      updateReminderSchedule,
      setNotificationsEnabled,
      setOnboardingCompleted,
      setNotificationTime,
      exportBackup,
      importBackup,
    }),
    [
      items,
      isLoading,
      error,
      notificationsEnabled,
      notificationTime,
      onboardingCompleted,
      addItem,
      updateItem,
      deleteItem,
      completeItem,
      undoCompleteItem,
      getCompletionHistory,
      updateReminderSchedule,
      setNotificationsEnabled,
      setOnboardingCompleted,
      setNotificationTime,
      exportBackup,
      importBackup,
    ],
  );

  return <LifeItemsContext.Provider value={value}>{children}</LifeItemsContext.Provider>;
}

export function useLifeItems() {
  const value = useContext(LifeItemsContext);
  if (!value) throw new Error('useLifeItems must be used inside LifeItemsProvider');
  return value;
}
