import { describe, expect, it } from 'vitest';
import { normalizeRuleDates, ruleShapeIssues } from './responsibilities.rules';

describe('assignment rule shape validation (§4.8)', () => {
  const base = { pattern: 'daily', startDate: '2026-08-26' } as const;

  it('accepts every valid pattern', () => {
    expect(ruleShapeIssues({ ...base })).toEqual([]);
    expect(ruleShapeIssues({ ...base, pattern: 'once' })).toEqual([]);
    expect(ruleShapeIssues({ ...base, pattern: 'every_n_days', interval: 3 })).toEqual([]);
    expect(ruleShapeIssues({ ...base, pattern: 'weekly', daysOfWeek: [1] })).toEqual([]);
    expect(ruleShapeIssues({ ...base, pattern: 'every_n_weeks', interval: 2, daysOfWeek: [3] })).toEqual([]);
    expect(ruleShapeIssues({ ...base, pattern: 'monthly', monthDay: 31 })).toEqual([]);
    expect(ruleShapeIssues({ ...base, pattern: 'dates', dates: ['2026-09-01'] })).toEqual([]);
    expect(ruleShapeIssues({ ...base, pattern: 'range', endDate: '2026-09-07' })).toEqual([]);
  });

  it('rejects missing per-pattern requirements', () => {
    expect(ruleShapeIssues({ ...base, pattern: 'weekly' })).toEqual(['DAYS_OF_WEEK_REQUIRED']);
    expect(ruleShapeIssues({ ...base, pattern: 'monthly' })).toEqual(['MONTH_DAY_REQUIRED']);
    expect(ruleShapeIssues({ ...base, pattern: 'dates' })).toEqual(['DATES_REQUIRED']);
    expect(ruleShapeIssues({ ...base, pattern: 'range' })).toEqual(['END_DATE_REQUIRED']);
    expect(
      ruleShapeIssues({ ...base, pattern: 'range', endDate: '2026-01-01' }),
    ).toEqual(['END_BEFORE_START']);
    expect(ruleShapeIssues({ ...base, pattern: 'nope' as never })).toEqual(['UNKNOWN_PATTERN']);
  });
});

describe('rule date normalization (§6.15 anchor stability)', () => {
  it('anchored patterns default anchorDate to startDate', () => {
    expect(
      normalizeRuleDates({ pattern: 'every_n_days', startDate: '2026-08-26' }).anchorDate,
    ).toBe('2026-08-26');
    expect(
      normalizeRuleDates({ pattern: 'every_n_weeks', startDate: '2026-08-26', interval: 2 })
        .anchorDate,
    ).toBe('2026-08-26');
  });

  it('non-anchored patterns leave anchor null; explicit anchors win', () => {
    expect(normalizeRuleDates({ pattern: 'weekly', startDate: '2026-08-26' }).anchorDate).toBeNull();
    expect(
      normalizeRuleDates({
        pattern: 'every_n_days',
        startDate: '2026-08-26',
        interval: 2,
        anchorDate: '2026-01-01',
      }).anchorDate,
    ).toBe('2026-01-01');
  });
});
