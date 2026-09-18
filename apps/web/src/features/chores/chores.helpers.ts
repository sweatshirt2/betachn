import { addDays, expandRule, type ExpandableRule } from '@chorify/core/schedule';
import { currentRotationTurn } from '@chorify/core';
import type { RuleInput, RuleRecord } from '@chorify/core';

/** Composer shape of one assignment rule (mirrors core ruleInputSchema). */
export type ComposerPattern =
  | 'once'
  | 'daily'
  | 'every_n_days'
  | 'weekly'
  | 'every_n_weeks'
  | 'monthly'
  | 'range';

export type ComposerAssignment =
  | { mode: 'fixed'; personIds: string[] }
  | { mode: 'rotation'; personIds: string[]; periodDays: number };

export type ComposerRule = {
  pattern: ComposerPattern;
  startDate: string;
  endDate: string | null;
  interval: number | null;
  daysOfWeek: number[] | null;
  monthDay: number | null;
  assignment: ComposerAssignment;
};

/** Weekday order for the picker (Sunday=0, matches core). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * Builds the wire `RuleInput` from composer state, mirroring server semantics
 * (§6.15): every_n patterns get interval ≥1, anchored patterns anchor at
 * startDate, monthly clamps to a real monthDay, rotation carries its period.
 */
export function buildRuleInput(rule: ComposerRule): RuleInput {
  const anchored = rule.pattern === 'every_n_days' || rule.pattern === 'every_n_weeks';
  const rotation =
    rule.assignment.mode === 'rotation' && rule.assignment.personIds.length > 1
      ? { periodDays: rule.assignment.periodDays, personIds: rule.assignment.personIds }
      : null;
  return {
    pattern: rule.pattern,
    interval:
      rule.pattern === 'every_n_days' || rule.pattern === 'every_n_weeks'
        ? Math.max(1, rule.interval ?? 1)
        : null,
    daysOfWeek: rule.pattern === 'weekly' ? (rule.daysOfWeek ?? []) : null,
    anchorDate: anchored ? rule.startDate : null,
    monthDay: rule.pattern === 'monthly' ? Math.min(31, Math.max(1, rule.monthDay ?? 1)) : null,
    startDate: rule.startDate,
    endDate: rule.pattern === 'range' ? (rule.endDate ?? rule.startDate) : null,
    rotation,
    personIds: rule.assignment.mode === 'fixed' ? rule.assignment.personIds : [],
  };
}

/** Structural preview rule for expandRule (no zod roundtrip needed). */
function previewRule(rule: ComposerRule): ExpandableRule {
  const wire = buildRuleInput(rule);
  return { ...wire, endDate: null, rotation: wire.rotation };
}

/**
 * Live natural-language preview dates (§5.5: the same engine that generates
 * occurrences powers the composer preview). Returns up to `count` ISO dates
 * within the next 35 days.
 */
export function previewDates(rule: ComposerRule, today: string, count = 3): string[] {
  if (rule.pattern === 'once' && rule.startDate < today) return [];
  const horizon = addDays(today, 35);
  const hits = expandRule(previewRule(rule), today, horizon);
  return hits.slice(0, count).map((h) => h.date);
}

/** ISO today in the household timezone (§6.8) — same shape the server uses. */
export function isoTodayInTz(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * D112 current-turn info for a rotation rule: occurrence assignees win when a
 * pending occurrence covers today (they may carry a §6.3 temporary reassign);
 * otherwise the anchored phase decides. Null when the rule isn't a rotation
 * covering today or the roster is empty.
 */
export function currentTurnForRule(
  rule: RuleRecord,
  today: string,
  pending: Array<{ dueDate: string; personIds: string[] }>,
): { personId: string; endsAt: string } | null {
  if (!rule.rotation || rule.rotation.personIds.length === 0) return null;
  return currentRotationTurn(
    rule.rotation,
    rule.anchorDate ?? rule.startDate,
    today,
    rule.startDate,
    rule.endDate,
    pending,
  );
}
