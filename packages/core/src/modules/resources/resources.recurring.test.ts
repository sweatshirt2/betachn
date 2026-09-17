import { describe, expect, it } from 'vitest';
import {
  computeRecurringState,
  recurringOverdueDays,
  suggestibleCycle,
  type RecurringItemLike,
} from './resources.rules';

const NOW = new Date('2026-09-17T12:00:00.000Z');
const DAY = 86_400_000;

function item(patch: Partial<RecurringItemLike> = {}): RecurringItemLike {
  return {
    intervalDays: 14,
    lastPurchaseAt: null,
    snoozedUntil: null,
    state: 'active',
    ...patch,
  };
}

describe('computeRecurringState (§4A.3 / D108–D110)', () => {
  it('paused reminders are idle regardless of anything else', () => {
    expect(computeRecurringState(item({ state: 'paused' }), NOW, false)).toBe('idle');
    expect(computeRecurringState(item({ state: 'paused' }), NOW, true)).toBe('idle');
  });

  it('an open list item wins — "on the list", never alert on top of it', () => {
    const due = item({ lastPurchaseAt: new Date(NOW.getTime() - 30 * DAY) });
    expect(computeRecurringState(due, NOW, true)).toBe('onList');
  });

  it('never bought through the flow yet → due (anchor-less reminder)', () => {
    expect(computeRecurringState(item(), NOW, false)).toBe('due');
  });

  it('nothing fires before the interval elapses', () => {
    const recent = item({ lastPurchaseAt: new Date(NOW.getTime() - 13 * DAY) });
    expect(computeRecurringState(recent, NOW, false)).toBe('idle');
  });

  it('due exactly at the interval; overdue after', () => {
    const due = item({ lastPurchaseAt: new Date(NOW.getTime() - 14 * DAY) });
    const overdue = item({ lastPurchaseAt: new Date(NOW.getTime() - 15 * DAY) });
    expect(computeRecurringState(due, NOW, false)).toBe('due');
    expect(computeRecurringState(overdue, NOW, false)).toBe('overdue');
  });

  it('snooze shelters only while it lasts (D109)', () => {
    const snoozed = item({
      lastPurchaseAt: new Date(NOW.getTime() - 20 * DAY),
      snoozedUntil: new Date(NOW.getTime() + 2 * DAY),
    });
    const lapsed = item({
      lastPurchaseAt: new Date(NOW.getTime() - 20 * DAY),
      snoozedUntil: new Date(NOW.getTime() - 2 * DAY),
    });
    expect(computeRecurringState(snoozed, NOW, false)).toBe('snoozed');
    expect(computeRecurringState(lapsed, NOW, false)).toBe('overdue');
  });
});

describe('recurringOverdueDays (micro-45 — gentle days, never an alarm)', () => {
  it('counts days past the interval', () => {
    const overdue = item({ intervalDays: 14, lastPurchaseAt: new Date(NOW.getTime() - 19 * DAY) });
    expect(recurringOverdueDays(overdue, NOW)).toBe(5);
  });

  it('never negative', () => {
    const due = item({ intervalDays: 14, lastPurchaseAt: new Date(NOW.getTime() - 10 * DAY) });
    expect(recurringOverdueDays(due, NOW)).toBe(0);
  });
});

describe('suggestibleCycle (D108 suggestion gate)', () => {
  it('needs ≥2 completed cycles in a sane range', () => {
    expect(
      suggestibleCycle({
        cycleCount: 2,
        avgCycleDays: 35,
        lastCycleDays: 33,
        outCount30d: 0,
        outCount90d: 1,
        lowCount90d: 2,
      }),
    ).toBe(true);
    expect(
      suggestibleCycle({
        cycleCount: 1,
        avgCycleDays: 35,
        lastCycleDays: 35,
        outCount30d: 0,
        outCount90d: 0,
        lowCount90d: 0,
      }),
    ).toBe(false);
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
  });
});
