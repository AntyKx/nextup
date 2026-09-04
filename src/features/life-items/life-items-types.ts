import { PeriodRecurrence, RecurrenceMode } from '@/features/life-items/date-utils';

export type Category = 'document' | 'vehicle' | 'home' | 'digital' | 'money' | 'travel';
export type Recurrence = 'none' | PeriodRecurrence;

export type { RecurrenceMode };

export type LifeItemReminder = {
  id: string;
  daysBefore: number;
  notificationId: string | null;
};

export type LifeItem = {
  id: string;
  title: string;
  category: Category;
  dueDate: string;
  anchorDay: number;
  recurrence: Recurrence;
  recurrenceMode: RecurrenceMode;
  note: string;
  reminders: LifeItemReminder[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  lastCompletedAt: string | null;
};

export type CompletionHistoryEntry = {
  id: string;
  itemId: string;
  scheduledDate: string;
  completedAt: string;
  note: string | null;
  /**
   * Exact pre-completion snapshot, so Undo can *restore* instead of
   * recompute. Null only for history rows written before v0.3.1, which
   * predate this snapshot — those fall back to a best-effort recompute
   * (see `resolveUndoState`).
   */
  previousDueDate: string | null;
  previousAnchorDay: number | null;
  previousCompletedAt: string | null;
  previousLastCompletedAt: string | null;
};

export type NewLifeItemInput = {
  title: string;
  category: Category;
  dueDate: string;
  recurrence: Recurrence;
  recurrenceMode: RecurrenceMode;
  note: string;
  reminderDays: number[];
};

export type UpdateLifeItemInput = Partial<NewLifeItemInput>;

export const categoryMeta: Record<Category, { label: string }> = {
  document: { label: '證件' },
  vehicle: { label: '車輛' },
  home: { label: '居家' },
  digital: { label: '3C' },
  money: { label: '帳務' },
  travel: { label: '旅行' },
};

export const recurrenceLabels: Record<Recurrence, string> = {
  none: '不重複',
  monthly: '每月更新',
  quarterly: '每 3 個月更新',
  yearly: '每年更新',
};

export const recurrenceModeLabels: Record<RecurrenceMode, string> = {
  fixed_schedule: '照原本日期往後算',
  from_completion: '從這次完成後重新算',
};

export const recurrenceModeDescriptions: Record<RecurrenceMode, string> = {
  fixed_schedule: '適合保險、證件、年費',
  from_completion: '適合濾芯、耗材、保養',
};
