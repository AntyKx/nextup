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
  fixed_schedule: '固定週期（保險、證件這類）',
  from_completion: '完成後才起算（耗材、保養這類）',
};
