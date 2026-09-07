import { describe, expect, it } from 'vitest';
import { addDays, diffDays, expandRule, isoTodayInTz, type ExpandableRule } from './schedule';

const rule = (over: Partial<ExpandableRule>): ExpandableRule => ({
  pattern: 'daily',
  startDate: '2025-01-01',
  personIds: ['p1'],
  ...over,
});

describe('expandRule — locked §11 cases', () => {
  it('weekly-Monday hits only Mondays', () => {
    const hits = expandRule(
      rule({ pattern: 'weekly', daysOfWeek: [1], startDate: '2025-06-02' }),
      '2025-06-01', // Sunday
      '2025-06-14', // two full weeks later
    );
    expect(hits.map((h) => h.date)).toEqual(['2025-06-02', '2025-06-09']);
    for (const hit of hits) expect(new Date(`${hit.date}T00:00:00Z`).getUTCDay()).toBe(1);
  });

  it('every-3-days crosses the month boundary correctly', () => {
    const hits = expandRule(
      rule({ pattern: 'every_n_days', interval: 3, startDate: '2025-01-30' }),
      '2025-01-30',
      '2025-02-05',
    );
    // anchor Jan 30 → Jan 30, Feb 2, Feb 5 (month rollover keeps phase)
    expect(hits.map((h) => h.date)).toEqual(['2025-01-30', '2025-02-02', '2025-02-05']);
  });

  it('monthly day-31 clamps to Feb 28 in a non-leap year', () => {
    const hits = expandRule(
      rule({ pattern: 'monthly', monthDay: 31, startDate: '2025-01-31' }),
      '2025-01-01',
      '2025-04-30',
    );
    expect(hits.map((h) => h.date)).toEqual(['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30']);
  });

  it('rotation index flips exactly at the 7-day boundary', () => {
    const rotating = rule({
      pattern: 'daily',
      startDate: '2025-03-03', // Monday
      rotation: { periodDays: 7, personIds: ['alice', 'bob'] },
    });
    const hits = expandRule(rotating, '2025-03-03', '2025-03-10');
    expect(hits.find((h) => h.date === '2025-03-08')?.personIds).toEqual(['alice']);
    // offset 6 still alice; the flip lands exactly at offset 7 (2025-03-10)
    expect(hits.find((h) => h.date === '2025-03-09')?.personIds).toEqual(['alice']);
    expect(hits.find((h) => h.date === '2025-03-10')?.personIds).toEqual(['bob']);
    expect(hits[0]?.personIds).toEqual(['alice']);
  });

  it('range window is inclusive of endDate and clipped by rule endDate', () => {
    const hits = expandRule(
      rule({ pattern: 'range', startDate: '2025-07-10', endDate: '2025-07-13' }),
      '2025-07-11',
      '2025-07-15',
    );
    expect(hits.map((h) => h.date)).toEqual(['2025-07-11', '2025-07-12', '2025-07-13']);
  });

  it('anchorDate shifts phases predictably', () => {
    const base = { pattern: 'every_n_days' as const, interval: 7 };
    const anchoredA = expandRule(rule({ ...base, startDate: '2025-05-01' }), '2025-05-01', '2025-05-14');
    const anchoredB = expandRule(
      rule({ ...base, startDate: '2025-05-01', anchorDate: '2025-05-03' }),
      '2025-05-01',
      '2025-05-14',
    );
    expect(anchoredA.map((h) => h.date)).toEqual(['2025-05-01', '2025-05-08']);
    // anchor shifted +2d → phase shifted +2d
    expect(anchoredB.map((h) => h.date)).toEqual(['2025-05-03', '2025-05-10']);
  });

  it('once fires only on startDate; dates pattern matches literal set', () => {
    expect(expandRule(rule({ pattern: 'once', startDate: '2025-01-05' }), '2025-01-01', '2025-01-10')).toEqual([
      { date: '2025-01-05', personIds: ['p1'] },
    ]);
    const literal = expandRule(
      rule({ pattern: 'dates', dates: ['2025-01-03', '2025-01-07'], startDate: '2025-01-01' }),
      '2025-01-01',
      '2025-01-10',
    );
    expect(literal.map((h) => h.date)).toEqual(['2025-01-03', '2025-01-07']);
  });

  it('empty personIds stay empty (household-wide claimable)', () => {
    const hits = expandRule(rule({ personIds: [] }), '2025-01-01', '2025-01-02');
    expect(hits.every((h) => h.personIds.length === 0)).toBe(true);
  });
});

describe('schedule date helpers', () => {
  it('diffDays/addDays roundtrip across DST-free UTC arithmetic', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(diffDays('2025-01-01', '2024-12-31')).toBe(-1);
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // leap year
  });
});

describe('isoTodayInTz — §6.8 day boundaries', () => {
  it('rolls the day at local midnight, not UTC midnight', () => {
    // 2026-09-07T01:30+03:00 = 2026-09-06T22:30Z — Addis is already Tuesday.
    const instant = new Date('2026-09-06T22:30:00Z');
    expect(isoTodayInTz('Africa/Addis_Ababa', instant)).toBe('2026-09-07');
    expect(isoTodayInTz('UTC', instant)).toBe('2026-09-06');
  });

  it('matches the pure generator window: same instant, opposite side of the line', () => {
    // 2026-09-07T20:00-07:00 = 2026-09-08T03:00Z — UTC flipped, Los Angeles not.
    const instant = new Date('2026-09-08T03:00:00Z');
    expect(isoTodayInTz('America/Los_Angeles', instant)).toBe('2026-09-07');
    expect(isoTodayInTz('UTC', instant)).toBe('2026-09-08');
  });
});
