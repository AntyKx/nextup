import {
  CompletionHistoryEntry,
  LifeItem,
  LifeItemReminder,
  NewLifeItemInput,
  UpdateLifeItemInput,
} from '@/features/life-items/life-items-types';

export type ApplyCompletionArgs = {
  scheduledDate: string;
  completedAt: string;
  nextDueDate: string | null;
  nextAnchorDay: number;
  note?: string;
  /** Pre-completion snapshot, persisted verbatim so Undo can restore it exactly. */
  previousDueDate: string;
  previousAnchorDay: number;
  previousCompletedAt: string | null;
  previousLastCompletedAt: string | null;
};

/**
 * Pure data access. No notification calls, no recurrence math — those live
 * in `life-items-service.ts`. Implemented by `.native.ts` (SQLite) and
 * `.web.ts` (localStorage); both satisfy this same interface.
 */
export interface LifeItemsRepository {
  init(): Promise<void>;
  listItems(): Promise<LifeItem[]>;
  getItem(id: string): Promise<LifeItem | null>;
  createItem(input: NewLifeItemInput & { anchorDay: number }): Promise<LifeItem>;
  updateItem(id: string, patch: UpdateLifeItemInput): Promise<LifeItem>;
  deleteItem(id: string): Promise<void>;
  applyCompletion(itemId: string, args: ApplyCompletionArgs): Promise<{ item: LifeItem; history: CompletionHistoryEntry }>;
  undoCompletion(historyId: string): Promise<LifeItem>;
  getCompletionHistory(itemId: string, limit?: number): Promise<CompletionHistoryEntry[]>;
  replaceReminders(itemId: string, daysBefore: number[]): Promise<LifeItemReminder[]>;
  setReminderNotificationId(reminderId: string, notificationId: string | null): Promise<void>;
  getSetting<T>(key: string, fallback: T): Promise<T>;
  setSetting(key: string, value: unknown): Promise<void>;
  /** True if this install had data (items, history, or a migration trace) before onboarding_completed was ever written — used to spare an upgrading user the onboarding flow. */
  hasPreExistingData(): Promise<boolean>;
}
