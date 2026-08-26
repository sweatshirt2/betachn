/** Per-pattern field requirements (§4.8 scheduling engine inputs). */
export interface RuleShapeInput {
  pattern: string;
  interval?: number | null | undefined;
  daysOfWeek?: number[] | null | undefined;
  monthDay?: number | null | undefined;
  dates?: string[] | null | undefined;
  startDate: string;
  endDate?: string | null | undefined;
}

/**
 * Pure shape validation per CN §38/§39 patterns. Returns human-readable issue
 * codes; empty array = valid. Tested exhaustively (§11 item 1).
 */
export function ruleShapeIssues(rule: RuleShapeInput): string[] {
  const issues: string[] = [];
  switch (rule.pattern) {
    case 'every_n_days':
      if (!rule.interval || rule.interval < 1) issues.push('INTERVAL_REQUIRED');
      break;
    case 'weekly':
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) issues.push('DAYS_OF_WEEK_REQUIRED');
      break;
    case 'every_n_weeks':
      if (!rule.interval || rule.interval < 1) issues.push('INTERVAL_REQUIRED');
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) issues.push('DAYS_OF_WEEK_REQUIRED');
      break;
    case 'monthly':
      if (!rule.monthDay || rule.monthDay < 1 || rule.monthDay > 31) issues.push('MONTH_DAY_REQUIRED');
      break;
    case 'dates':
      if (!rule.dates || rule.dates.length === 0) issues.push('DATES_REQUIRED');
      break;
    case 'range':
      if (!rule.endDate) issues.push('END_DATE_REQUIRED');
      else if (rule.endDate < rule.startDate) issues.push('END_BEFORE_START');
      break;
    case 'once':
    case 'daily':
      break;
    default:
      issues.push('UNKNOWN_PATTERN');
  }
  return issues;
}

/** Defaults applied at insert: anchored patterns anchor at startDate (§6.15). */
export function normalizeRuleDates(rule: RuleShapeInput & { anchorDate?: string | null }): {
  anchorDate: string | null;
} {
  const anchored = ['every_n_days', 'every_n_weeks'].includes(rule.pattern);
  return { anchorDate: rule.anchorDate ?? (anchored ? rule.startDate : null) };
}
