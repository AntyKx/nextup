import { palette } from '@/constants/design';
import { LifeItem, Recurrence } from '@/features/life-items/life-items-types';

const DAY_MS = 86_400_000;

export function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysUntil(dueDate: string) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Math.ceil((parseLocalDate(dueDate).getTime() - todayStart.getTime()) / DAY_MS);
}

export function formatDisplayDate(value: string) {
  const date = parseLocalDate(value);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

export function sortByDueDate(a: LifeItem, b: LifeItem) {
  return a.dueDate.localeCompare(b.dueDate);
}

export function advanceDueDate(value: string, recurrence: Recurrence) {
  const date = parseLocalDate(value);
  if (recurrence === 'monthly') date.setMonth(date.getMonth() + 1);
  if (recurrence === 'quarterly') date.setMonth(date.getMonth() + 3);
  if (recurrence === 'yearly') date.setFullYear(date.getFullYear() + 1);
  return formatIsoDate(date);
}

export function urgencyMeta(days: number) {
  if (days <= 7) return { color: palette.danger, background: '#F6E1D6' };
  if (days <= 30) return { color: palette.warning, background: '#F3E7C9' };
  return { color: palette.safe, background: '#E4E9DA' };
}

export function nextThirtyDays(items: LifeItem[]) {
  const nearest = items.slice().sort(sortByDueDate)[0];
  if (!nearest) return '目前都安排好了';
  const days = daysUntil(nearest.dueDate);
  if (days < 0) return `${nearest.title} 已逾期`;
  if (days === 0) return `${nearest.title} 就是今天`;
  return `最近是 ${nearest.title}，還有 ${days} 天`;
}
