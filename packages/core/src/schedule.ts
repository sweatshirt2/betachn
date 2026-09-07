/**
 * Pure scheduling engine (plan §4.8). Day-granular: dates are 'YYYY-MM-DD'
 * strings; all arithmetic in UTC so no timezone drifts into comparisons.
 * Day boundaries vs households.timezone are computed by isoTodayInTz (§6.8).
 */
export type SchedulePattern =
  | 'once'
  | 'daily'
  | 'every_n_days'
  | 'weekly'
  | 'every_n_weeks'
  | 'monthly'
  | 'dates'
  | 'range';

export interface Rotation {
  periodDays: number;
  /** Array order IS the rotation (§6.15); index anchored at rule creation. */
  personIds: string[];
}

/** Structurally compatible with db assignment_rules rows. */
export interface ExpandableRule {
  pattern: SchedulePattern;
  interval?: number | null;
  daysOfWeek?: number[] | null;
  anchorDate?: string | null;
  monthDay?: number | null;
  dates?: string[] | null;
  startDate: string;
  endDate?: string | null;
  rotation?: Rotation | null;
  personIds: string[];
}

export interface ExpandedOccurrence {
  date: string;
  personIds: string[];
}

export function parseISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return Date.UTC(y, m - 1, d);
}

export function toISO(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toISO(parseISO(iso) + days * 86_400_000);
}

/** Whole days from `fromIso` to `toIso` (positive when toIso is later). */
export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((parseISO(toIso) - parseISO(fromIso)) / 86_400_000);
}

/** Sunday = 0 … Saturday = 6 (matches assignment_rules.daysOfWeek). */
function dayOfWeek(iso: string): number {
  return new Date(parseISO(iso)).getUTCDay();
}

function daysInMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

/**
 * Rotation resolution: floor((date − anchor)/periodDays) mod len — negative
 * offsets wrap safely; membership edits never rewrite the anchor phase.
 */
export function resolveAssignees(rule: ExpandableRule, iso: string): string[] {
  const rotation = rule.rotation;
  if (rotation && rotation.personIds.length > 0) {
    const anchor = rule.anchorDate ?? rule.startDate;
    const idx = Math.floor(diffDays(anchor, iso) / rotation.periodDays);
    const len = rotation.personIds.length;
    const wrapped = ((idx % len) + len) % len;
    const personId = rotation.personIds[wrapped];
    return personId === undefined ? [] : [personId];
  }
  return [...rule.personIds];
}

function eachDay(windowStart: string, windowEnd: string): string[] {
  const days: string[] = [];
  for (let iso = windowStart; ; iso = addDays(iso, 1)) {
    days.push(iso);
    if (iso === windowEnd) break;
  }
  return days;
}
/**
 * Expands a rule into occurrences within the inclusive window
 * [windowStart, windowEnd], intersected with the rule's own [startDate, endDate].
 */
export function expandRule(
  rule: ExpandableRule,
  windowStart: string,
  windowEnd: string,
): ExpandedOccurrence[] {
  const start = diffDays(windowStart, rule.startDate) > 0 ? rule.startDate : windowStart;
  const end = windowEnd;
  const hardEnd = rule.endDate !== null && rule.endDate !== undefined ? rule.endDate : end;
  const effEnd = diffDays(end, hardEnd) > 0 ? end : hardEnd;

  const anchor = rule.anchorDate ?? rule.startDate;
  const days = diffDays(start, effEnd) < 0 ? [] : eachDay(start, effEnd);

  const hits: ExpandedOccurrence[] = [];
  for (const iso of days) {
    let matches: boolean;
    switch (rule.pattern) {
      case 'once':
        matches = iso === rule.startDate;
        break;
      case 'daily':
        matches = true;
        break;
      case 'range':
        matches = true;
        break;
      case 'every_n_days': {
        const n = rule.interval ?? 1;
        const offset = diffDays(anchor, iso);
        matches = offset >= 0 && offset % n === 0;
        break;
      }
      case 'every_n_weeks': {
        const n = rule.interval ?? 1;
        const weekIndex = Math.floor(diffDays(anchor, iso) / 7);
        matches =
          weekIndex % n === 0 &&
          (rule.daysOfWeek?.includes(dayOfWeek(iso)) ?? dayOfWeek(iso) === dayOfWeek(anchor));
        break;
      }
      case 'weekly':
        matches = rule.daysOfWeek?.includes(dayOfWeek(iso)) ?? false;
        break;
      case 'monthly': {
        const [y, m] = iso.split('-').map(Number);
        if (y === undefined || m === undefined) throw new Error(`Invalid ISO date: ${iso}`);
        const clamped = Math.min(rule.monthDay ?? 1, daysInMonth(y, m));
        matches = Number(iso.slice(8, 10)) === clamped;
        break;
      }
      case 'dates':
        matches = rule.dates?.includes(iso) ?? false;
        break;
      default:
        matches = false;
    }
    if (matches) hits.push({ date: iso, personIds: resolveAssignees(rule, iso) });
  }
  return hits;
}

/**
 * §6.8 day boundary: the ISO calendar day (YYYY-MM-DD) it is RIGHT NOW in
 * `timezone`, computed via Intl from the instant `now`. Pure — services pass
 * their clock's instant; device jobs pass new Date(). Used by occurrence
 * generation windows, the missed sweep, regeneration cutoffs and the digest,
 * so a household in Addis Ababa never flips a day on a UTC server clock.
 */
export function isoTodayInTz(timezone: string, now: Date): string {
  // en-CA formats as YYYY-MM-DD — one stable parse-free shape.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
