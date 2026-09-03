export type Category = 'document' | 'vehicle' | 'home' | 'digital' | 'money' | 'travel';
export type Recurrence = 'none' | 'monthly' | 'quarterly' | 'yearly';

export type LifeItem = {
  id: string;
  title: string;
  category: Category;
  dueDate: string;
  reminderDays: number;
  recurrence: Recurrence;
  note: string;
  createdAt: string;
  completedAt: string | null;
  lastCompletedAt: string | null;
};

export type NewLifeItem = Pick<
  LifeItem,
  'title' | 'category' | 'dueDate' | 'reminderDays' | 'recurrence' | 'note'
>;

export type AppSnapshot = {
  version: 1;
  items: LifeItem[];
};

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
