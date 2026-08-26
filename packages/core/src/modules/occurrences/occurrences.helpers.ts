import type { SchedulePattern } from '../../schedule';

/**
 * Cadence-based missed-grace windows (§4.9 / D14): how many days past
 * dueDate a missed chore stays visible on Today's subdued strip before it
 * retires to history-only.
 */
export function graceWindowDays(pattern: SchedulePattern, interval?: number | null): number {
  switch (pattern) {
    case 'once':
    case 'dates':
    case 'range':
      return 1;
    case 'every_n_days':
      return interval ?? 1;
    case 'weekly':
      return 7;
    case 'every_n_weeks':
      return 7 * (interval ?? 1);
    case 'monthly':
      return 7;
    case 'daily':
      return 1;
    default:
      return 1;
  }
}

export function isWithinGraceWindow(
  pattern: SchedulePattern,
  interval: number | null | undefined,
  dueDate: string,
  today: string,
  diffDays: (fromIso: string, toIso: string) => number,
): boolean {
  const elapsed = diffDays(dueDate, today);
  if (elapsed <= 0) return true; // not yet missed
  return elapsed <= graceWindowDays(pattern, interval);
}
