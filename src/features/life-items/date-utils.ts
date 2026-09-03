/**
 * Pure date/recurrence math — zero React Native imports so this file can be
 * unit-tested directly under plain Node (see `date-utils.test.ts`).
 */

export type PeriodRecurrence = 'monthly' | 'quarterly' | 'yearly';
export type RecurrenceMode = 'fixed_schedule' | 'from_completion';

const DAY_MS = 86_400_000;
const MONTHS_PER_PERIOD: Record<PeriodRecurrence, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

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

/** `today` is injectable so tests can pin "now"; production call sites omit it. */
export function daysUntil(dueDate: string, today: Date = new Date()) {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Math.ceil((parseLocalDate(dueDate).getTime() - todayStart.getTime()) / DAY_MS);
}

/**
 * Advances `fromDate` by `periods` whole recurrence periods, clamping the
 * day-of-month to `anchorDay` (or the target month's last day, whichever is
 * smaller). This is what keeps a "31st of the month" cadence intact across
 * short months instead of overflowing into the next month.
 */
export function addPeriodClamped(fromDate: string, recurrence: PeriodRecurrence, anchorDay: number, periods: number) {
  const start = parseLocalDate(fromDate);
  const monthsToAdd = MONTHS_PER_PERIOD[recurrence] * periods;
  const totalMonths = start.getMonth() + monthsToAdd;
  const targetYear = start.getFullYear() + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(anchorDay, lastDayOfTargetMonth);
  return formatIsoDate(new Date(targetYear, targetMonth, day, 12));
}

export type CalculateNextDueDateInput = {
  dueDate: string;
  recurrence: PeriodRecurrence;
  recurrenceMode: RecurrenceMode;
  anchorDay: number;
  completedAt: string;
  today: string;
};

export type CalculateNextDueDateResult = {
  nextDueDate: string;
  nextAnchorDay: number;
};

/**
 * `from_completion` restarts the cadence from today, ignoring how overdue
 * the old schedule was. `fixed_schedule` keeps the original calendar
 * cadence and, if multiple periods have been missed, advances straight to
 * the next *future* occurrence in one completion rather than +1 period —
 * recomputed fresh from the original due date each iteration so clamping
 * never compounds across the catch-up.
 */
export function calculateNextDueDate(input: CalculateNextDueDateInput): CalculateNextDueDateResult {
  if (input.recurrenceMode === 'from_completion') {
    const completionDate = input.completedAt.slice(0, 10);
    const newAnchor = parseLocalDate(completionDate).getDate();
    return {
      nextDueDate: addPeriodClamped(completionDate, input.recurrence, newAnchor, 1),
      nextAnchorDay: newAnchor,
    };
  }

  const todayTime = parseLocalDate(input.today).getTime();
  let periods = 1;
  let candidate = addPeriodClamped(input.dueDate, input.recurrence, input.anchorDay, periods);
  while (parseLocalDate(candidate).getTime() <= todayTime && periods < 1000) {
    periods += 1;
    candidate = addPeriodClamped(input.dueDate, input.recurrence, input.anchorDay, periods);
  }
  return { nextDueDate: candidate, nextAnchorDay: input.anchorDay };
}
