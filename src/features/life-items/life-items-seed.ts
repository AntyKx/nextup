import { AppSnapshot, Category, Recurrence } from '@/features/life-items/life-items-types';
import { addDays, formatIsoDate } from '@/features/life-items/life-items-utils';

const sample = (id: string, title: string, category: Category, days: number, reminderDays: number, recurrence: Recurrence) => ({
  id,
  title,
  category,
  dueDate: formatIsoDate(addDays(new Date(), days)),
  reminderDays,
  recurrence,
  note: '',
  createdAt: new Date().toISOString(),
  completedAt: null,
  lastCompletedAt: null,
});

export function createSeedSnapshot(): AppSnapshot {
  return {
    version: 1,
    items: [
      sample('sample-filter', 'Brita 濾芯', 'home', 9, 3, 'quarterly'),
      sample('sample-card', '國泰信用卡年費', 'money', 26, 14, 'yearly'),
      sample('sample-insurance', '汽車強制險', 'vehicle', 54, 30, 'yearly'),
      sample('sample-passport', '護照換發', 'document', 184, 180, 'none'),
    ],
  };
}
