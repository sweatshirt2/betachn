import { describe, expect, it } from 'vitest';
import { aggregateToday } from './today.aggregate';

const SCHEDULES = {
  rule1: { pattern: 'daily' as const, interval: null },
  rule2: { pattern: 'weekly' as const, interval: null },
  rule3: { pattern: 'once' as const, interval: null },
};

function base(overrides: Partial<Parameters<typeof aggregateToday>[0]> = {}): Parameters<typeof aggregateToday>[0] {
  return {
    today: '2026-09-06',
    occurrences: [],
    schedules: SCHEDULES,
    responsibilities: [{ id: 'r1', title: 'Laundry' }],
    supplies: [],
    shoppingItems: [],
    assets: [],
    serviceRecords: [],
    recentActivity: [],
    ...overrides,
  };
}

const occ = (over: Partial<Parameters<typeof aggregateToday>[0]['occurrences'][number]> = {}) => ({
  id: 'o',
  responsibilityId: 'r1',
  ruleId: 'rule1',
  dueDate: '2026-09-06',
  status: 'pending',
  ...over,
});

describe('aggregateToday (§4.14 /today shape)', () => {
  it('buckets pending due-today occurrences with titles', () => {
    const out = aggregateToday(base({ occurrences: [occ(), occ({ id: 'o2', dueDate: '2026-09-07' })] }));
    expect(out.todayOccurrences.map((o) => o.id)).toEqual(['o']);
    expect(out.todayOccurrences[0]?.title).toBe('Laundry');
  });

  it('falls back to a generic title for unknown responsibilities', () => {
    const out = aggregateToday(base({ occurrences: [occ({ responsibilityId: 'gone' })] }));
    expect(out.todayOccurrences[0]?.title).toBe('Chore');
  });

  it('keeps missed rows inside the cadence grace window only', () => {
    const out = aggregateToday(
      base({
        occurrences: [
          // weekly grace = 7d (D14): yesterday's and 3-day-old misses both visible;
          // 8-day-old is not.
          occ({ id: 'yesterday', status: 'missed', dueDate: '2026-09-05', ruleId: 'rule2' }),
          occ({ id: 'three-days', status: 'missed', dueDate: '2026-09-03', ruleId: 'rule2' }),
          occ({ id: 'eight-days', status: 'missed', dueDate: '2026-08-29', ruleId: 'rule2' }),
          // daily grace = 1d: 2-day-old miss already retired to history.
          occ({ id: 'daily-in', status: 'missed', dueDate: '2026-09-05', ruleId: 'rule1' }),
          occ({ id: 'daily-out', status: 'missed', dueDate: '2026-09-04', ruleId: 'rule1' }),
          // unknown rule → never grace-displayed.
          occ({ id: 'unknown-rule', status: 'missed', dueDate: '2026-09-05', ruleId: 'nope' }),
        ],
      }),
    );
    expect(out.missedInGrace.map((o) => o.id)).toEqual(['yesterday', 'three-days', 'daily-in']);
  });

  it('caps upcoming at 20 after the window filter, includes day+7, excludes today and day+8', () => {
    const some = Array.from({ length: 5 }, (_, i) =>
      occ({ id: `u${i}`, dueDate: '2026-09-07', ruleId: 'rule3' }),
    );
    const out = aggregateToday(
      base({ occurrences: [...some, occ({ id: 'far', dueDate: '2026-09-14' }), occ({ id: 'window-edge', dueDate: '2026-09-13' })] }),
    );
    expect(out.upcoming.some((o) => o.id === 'far')).toBe(false);
    expect(out.upcoming.some((o) => o.id === 'window-edge')).toBe(true);
  });

  it('caps upcoming at 20 when the window holds more than 20 pending', () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      occ({ id: `u${i}`, dueDate: '2026-09-07', ruleId: 'rule3' }),
    );
    expect(aggregateToday(base({ occurrences: many })).upcoming).toHaveLength(20);
  });

  it('flags low/out supplies and caps open shopping items', () => {
    const out = aggregateToday(
      base({
        supplies: [
          { id: 's1', name: 'Detergent', state: 'low' },
          { id: 's2', name: 'Rice', state: 'available' },
          { id: 's3', name: 'Coffee', state: 'out' },
        ],
        shoppingItems: Array.from({ length: 22 }, (_, i) => ({ id: `i${i}`, name: `Item ${i}`, purchasedAt: null })),
      }),
    );
    expect(out.lowSupplies.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(out.openShoppingItems).toHaveLength(20);
  });

  it('computes maintenance due inside the 7-day horizon from last service + interval', () => {
    const out = aggregateToday(
      base({
        assets: [
          { id: 'a1', name: 'Washer', maintenanceIntervalDays: 30 },
          { id: 'a2', name: 'Never serviced', maintenanceIntervalDays: 30 },
          { id: 'a3', name: 'No interval', maintenanceIntervalDays: null },
        ],
        serviceRecords: [{ assetId: 'a1', servicedOn: '2026-08-12' }], // +30 = 2026-09-11
      }),
    );
    expect(out.maintenanceDue).toEqual([{ assetId: 'a1', assetName: 'Washer', nextDue: '2026-09-11' }]);
  });

  it('keeps assets whose next-due already passed (overdue counts as due)', () => {
    const out = aggregateToday(
      base({
        assets: [{ id: 'a1', name: 'Washer', maintenanceIntervalDays: 7 }],
        serviceRecords: [{ assetId: 'a1', servicedOn: '2026-08-01' }],
      }),
    );
    expect(out.maintenanceDue[0]?.nextDue).toBe('2026-08-08');
  });

  it('counts completions by dueDate within the last 7 days including today', () => {
    const out = aggregateToday(
      base({
        occurrences: [
          occ({ id: 'c1', status: 'completed', dueDate: '2026-09-06' }),
          occ({ id: 'c2', status: 'completed', dueDate: '2026-09-01' }),
          occ({ id: 'c3', status: 'completed', dueDate: '2026-08-30' }), // outside window
          occ({ id: 'p1', status: 'pending', dueDate: '2026-09-05' }),
        ],
      }),
    );
    expect(out.completedThisWeek).toBe(2);
  });

  it('passes recent activity through untouched', () => {
    const activity = [{ id: 'e1', type: 'occurrence.completed' }];
    const out = aggregateToday(base({ recentActivity: activity }));
    expect(out.recentActivity).toBe(activity);
  });
});
