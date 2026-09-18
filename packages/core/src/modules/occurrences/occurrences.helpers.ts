import { addDays, diffDays, type Rotation, type SchedulePattern } from '../../schedule';

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

/**
 * Current-turn visibility for rotation rules (§16b D112): pure derive so the
 * chore detail and task rows can show "{name}'s turn until {date}" without a
 * new wire contract. Two inputs:
 *
 * - `rotationTurns(rule, today)` computes the RAW phase from the anchored
 *   rotation index (§6.15) — for rules without materialized occurrences in
 *   hand (e.g. a composer preview).
 * - `currentTurnFromOccurrences(rotation, today, pending)` prefers the
 *   occurrence assignees when they exist: occurrence-level "This week only"
 *   reassigns (§6.3) may have already moved a turn, and the chip must agree
 *   with what the rows show. Falls back to the raw phase when no pending
 *   occurrence covers `today`.
 */

/** The rotator for the phase covering `iso`, or null outside the rule's own window. */
export function rotationTurn(
  rotation: Rotation,
  anchorDate: string,
  iso: string,
  startDate: string,
  endDate?: string | null,
): string | null {
  if (rotation.personIds.length === 0) return null;
  if (diffDays(startDate, iso) < 0) return null;
  if (endDate && diffDays(iso, endDate) < 0) return null;
  const offset = Math.floor(diffDays(anchorDate, iso) / rotation.periodDays);
  const len = rotation.personIds.length;
  const wrapped = ((offset % len) + len) % len;
  return rotation.personIds[wrapped] ?? null;
}

/** Next boundary ISO: the day the current phase ends (exclusive). */
export function rotationTurnEndsAt(anchorDate: string, periodDays: number, iso: string): string {
  const offset = Math.floor(diffDays(anchorDate, iso) / periodDays);
  const phaseStart = addDays(anchorDate, offset * periodDays);
  return addDays(phaseStart, periodDays);
}

export interface PendingTurnOccurrence {
  dueDate: string;
  personIds: string[];
}

/**
 * The occurrence-backed turn: pending occurrence due today wins (it may carry
 * a §6.3 temporary reassign); otherwise the anchored phase decides.
 */
export function currentRotationTurn(
  rotation: Rotation,
  anchorDate: string,
  today: string,
  startDate: string,
  endDate?: string | null,
  pending?: PendingTurnOccurrence[],
): { personId: string; endsAt: string } | null {
  const todays = (pending ?? []).filter((o) => o.dueDate === today);
  const raw = rotationTurn(rotation, anchorDate, today, startDate, endDate);
  const personId = todays[0]?.personIds[0] ?? raw;
  if (!personId) return null;
  return { personId, endsAt: rotationTurnEndsAt(anchorDate, rotation.periodDays, today) };
}
