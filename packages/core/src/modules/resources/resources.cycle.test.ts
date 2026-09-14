import { describe, expect, it } from 'vitest';
import {
  computeSupplyCycleStats,
  suggestibleCycle,
  supplyEventTypeForTransition,
} from './resources.rules';
import type { SupplyEventLike } from './resources.rules';

function daysAgo(days: number, from: Date): Date {
  return new Date(from.getTime() - days * 24 * 3600 * 1000);
}

const NOW = new Date('2026-09-14T12:00:00Z');

describe('supplyEventTypeForTransition', () => {
  it('maps available → restocked (cycle closer)', () => {
    expect(supplyEventTypeForTransition('available')).toBe('restocked');
  });

  it('maps low/out → marked events', () => {
    expect(supplyEventTypeForTransition('low')).toBe('marked_low');
    expect(supplyEventTypeForTransition('out')).toBe('marked_out');
  });
});

describe('computeSupplyCycleStats', () => {
  it('returns zeroed stats for empty history', () => {
    expect(computeSupplyCycleStats([], NOW)).toEqual({
      cycleCount: 0,
      avgCycleDays: null,
      lastCycleDays: null,
      outCount30d: 0,
      outCount90d: 0,
      lowCount90d: 0,
    });
  });

  it('creation alone anchors cycle 0 — no cycles yet', () => {
    const events: SupplyEventLike[] = [
      { type: 'created', occurredAt: daysAgo(10, NOW) },
    ];
    const stats = computeSupplyCycleStats(events, NOW);
    expect(stats.cycleCount).toBe(0);
    expect(stats.avgCycleDays).toBeNull();
  });

  it('counts one cycle per restock-to-restock span', () => {
    // created day 63 → out day 35 → restocked day 35 → out day 7 → restocked day 7.
    const events: SupplyEventLike[] = [
      { type: 'created', occurredAt: daysAgo(63, NOW) },
      { type: 'marked_out', occurredAt: daysAgo(35, NOW) },
      { type: 'restocked', occurredAt: daysAgo(35, NOW) },
      { type: 'marked_out', occurredAt: daysAgo(7, NOW) },
      { type: 'restocked', occurredAt: daysAgo(7, NOW) },
    ];
    const stats = computeSupplyCycleStats(events, NOW);
    expect(stats.cycleCount).toBe(2);
    expect(stats.lastCycleDays).toBe(28);
    expect(stats.avgCycleDays).toBe(28);
    expect(stats.outCount90d).toBe(2);
    expect(stats.outCount30d).toBe(1);
  });

  it('out-of-order input still sorts correctly', () => {
    const events: SupplyEventLike[] = [
      { type: 'restocked', occurredAt: daysAgo(7, NOW) },
      { type: 'created', occurredAt: daysAgo(63, NOW) },
      { type: 'restocked', occurredAt: daysAgo(35, NOW) },
    ];
    expect(computeSupplyCycleStats(events, NOW).lastCycleDays).toBe(28);
  });

  it('low/out events inside the window count even without a closed cycle', () => {
    const events: SupplyEventLike[] = [
      { type: 'created', occurredAt: daysAgo(20, NOW) },
      { type: 'marked_low', occurredAt: daysAgo(5, NOW) },
    ];
    const stats = computeSupplyCycleStats(events, NOW);
    expect(stats.cycleCount).toBe(0);
    expect(stats.lowCount90d).toBe(1);
    expect(stats.outCount90d).toBe(0);
  });

  it('events older than the windows do not count', () => {
    const events: SupplyEventLike[] = [
      { type: 'marked_out', occurredAt: daysAgo(31, NOW) },
      { type: 'marked_out', occurredAt: daysAgo(100, NOW) },
      { type: 'marked_low', occurredAt: daysAgo(95, NOW) },
    ];
    const stats = computeSupplyCycleStats(events, NOW);
    expect(stats.outCount30d).toBe(0);
    expect(stats.outCount90d).toBe(1);
    expect(stats.lowCount90d).toBe(0);
  });

  it('discards implausible cycle spans over two years', () => {
    const events: SupplyEventLike[] = [
      { type: 'created', occurredAt: daysAgo(1100, NOW) },
      { type: 'restocked', occurredAt: daysAgo(30, NOW) },
      { type: 'restocked', occurredAt: daysAgo(7, NOW) },
    ];
    const stats = computeSupplyCycleStats(events, NOW);
    expect(stats.cycleCount).toBe(1);
    expect(stats.lastCycleDays).toBe(23);
  });
});

describe('suggestibleCycle (D108 gate)', () => {
  it('requires at least two completed cycles', () => {
    expect(
      suggestibleCycle({
        cycleCount: 1,
        avgCycleDays: 20,
        lastCycleDays: 20,
        outCount30d: 0,
        outCount90d: 0,
        lowCount90d: 0,
      }),
    ).toBe(false);
  });

  it('accepts a sane average', () => {
    expect(
      suggestibleCycle({
        cycleCount: 2,
        avgCycleDays: 35,
        lastCycleDays: 30,
        outCount30d: 0,
        outCount90d: 0,
        lowCount90d: 0,
      }),
    ).toBe(true);
  });

  it('rejects averages outside the 3–365 day band', () => {
    expect(
      suggestibleCycle({
        cycleCount: 3,
        avgCycleDays: 2,
        lastCycleDays: 2,
        outCount30d: 0,
        outCount90d: 0,
        lowCount90d: 0,
      }),
    ).toBe(false);
    expect(
      suggestibleCycle({
        cycleCount: 3,
        avgCycleDays: 400,
        lastCycleDays: 400,
        outCount30d: 0,
        outCount90d: 0,
        lowCount90d: 0,
      }),
    ).toBe(false);
  });
});
