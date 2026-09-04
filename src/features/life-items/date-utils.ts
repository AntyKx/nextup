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

/**
 * Converts a UTC ISO timestamp to the device's *local* calendar day.
 * `timestamp.slice(0, 10)` looks equivalent but reads the UTC date — wrong
 * whenever the local offset pushes the instant across midnight (e.g. a
 * completion logged at 00:30 Asia/Taipei is still "yesterday" in UTC).
 * Always use this instead of slicing an ISO timestamp for local-day math.
 */
export function timestampToLocalIsoDate(timestamp: string): string {
  return formatIsoDate(new Date(timestamp));
}

export function anchorDayFromIsoDate(value: string): number {
  return parseLocalDate(value).getDate();
}

/**
 * An Edit form always resubmits the full record, `dueDate` included, even
 * when the user only touched an unrelated field. Recomputing anchorDay
 * whenever `nextDueDate` is merely *present* (rather than *different*)
 * silently collapses a clamped anchor (e.g. 31 clamped to 28 for February)
 * down to the clamped value, permanently losing the user's real intent.
 */
export function resolveAnchorDayOnUpdate(existingDueDate: string, existingAnchorDay: number, nextDueDate: string | undefined): number {
  if (!nextDueDate || nextDueDate === existingDueDate) return existingAnchorDay;
  return anchorDayFromIsoDate(nextDueDate);
}

export type UndoableCompletionSnapshot = {
  scheduledDate: string;
  previousDueDate: string | null;
  previousAnchorDay: number | null;
  previousCompletedAt: string | null;
  previousLastCompletedAt: string | null;
};

export type UndoState = {
  dueDate: string;
  anchorDay: number;
  completedAt: string | null;
  lastCompletedAt: string | null;
};

/**
 * Undo must *restore* the pre-completion state, not recompute it — deriving
 * anchorDay from `scheduledDate` loses a clamped anchor the same way an Edit
 * resubmission does. History rows written from v0.3.1 onward carry an exact
 * snapshot; rows from before that (legacy) don't, so we fall back to the old
 * recompute-from-scheduled-date behavior for those — imperfect, but it's the
 * best available without a real snapshot.
 */
export function resolveUndoState(history: UndoableCompletionSnapshot, legacyLastCompletedAt: string | null): UndoState {
  if (history.previousDueDate !== null && history.previousAnchorDay !== null) {
    return {
      dueDate: history.previousDueDate,
      anchorDay: history.previousAnchorDay,
      completedAt: history.previousCompletedAt,
      lastCompletedAt: history.previousLastCompletedAt,
    };
  }
  return {
    dueDate: history.scheduledDate,
    anchorDay: anchorDayFromIsoDate(history.scheduledDate),
    completedAt: null,
    lastCompletedAt: legacyLastCompletedAt,
  };
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
    const completionDate = timestampToLocalIsoDate(input.completedAt);
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
