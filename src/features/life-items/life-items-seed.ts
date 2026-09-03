import { addDays, formatIsoDate, parseLocalDate } from '@/features/life-items/date-utils';
import { createId } from '@/features/life-items/id';
import { Category, LifeItem, Recurrence } from '@/features/life-items/life-items-types';

function sample(
  idSuffix: string,
  title: string,
  category: Category,
  days: number,
  reminderDays: number,
  recurrence: Recurrence,
): LifeItem {
  const dueDate = formatIsoDate(addDays(new Date(), days));
  const now = new Date().toISOString();
  return {
    id: `sample-${idSuffix}`,
    title,
    category,
    dueDate,
    anchorDay: parseLocalDate(dueDate).getDate(),
    recurrence,
    recurrenceMode: 'fixed_schedule',
    note: '',
    reminders: [{ id: createId('reminder'), daysBefore: reminderDays, notificationId: null }],
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    lastCompletedAt: null,
  };
}

export function createSeedItems(): LifeItem[] {
  return [
    sample('filter', 'Brita 濾芯', 'home', 9, 3, 'quarterly'),
    sample('card', '國泰信用卡年費', 'money', 26, 14, 'yearly'),
    sample('insurance', '汽車強制險', 'vehicle', 54, 30, 'yearly'),
    sample('passport', '護照換發', 'document', 184, 180, 'none'),
  ];
}
