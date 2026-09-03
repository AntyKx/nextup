import { palette } from '@/constants/design';
import { daysUntil, parseLocalDate } from '@/features/life-items/date-utils';
import { LifeItem } from '@/features/life-items/life-items-types';

export { addDays, addPeriodClamped, calculateNextDueDate, daysUntil, formatIsoDate, parseLocalDate } from '@/features/life-items/date-utils';

export function formatDisplayDate(value: string) {
  const date = parseLocalDate(value);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

export function sortByDueDate(a: LifeItem, b: LifeItem) {
  return a.dueDate.localeCompare(b.dueDate);
}

export function urgencyMeta(days: number) {
  if (days <= 7) return { color: palette.danger, background: '#F6E1D6' };
  if (days <= 30) return { color: palette.warning, background: '#F3E7C9' };
  return { color: palette.safe, background: '#E4E9DA' };
}

/** "已逾期 N 天" / "今天到期" / "還有 N 天" — the one place overdue/today/future phrasing is decided. */
export function formatDueStatus(days: number): string {
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `還有 ${days} 天`;
}

export function isOverdue(item: LifeItem): boolean {
  return !item.completedAt && daysUntil(item.dueDate) < 0;
}
