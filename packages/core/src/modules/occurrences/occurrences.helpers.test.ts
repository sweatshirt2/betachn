import { describe, expect, it } from 'vitest';
import { diffDays } from '../../schedule';
import {
  currentRotationTurn,
  graceWindowDays,
  isWithinGraceWindow,
  rotationTurn,
  rotationTurnEndsAt,
} from './occurrences.helpers';

describe('missed grace windows per cadence (§4.9 / D14)', () => {
  it.each([
    ['once', null, 1],
    ['dates', null, 1],
    ['range', null, 1],
    ['daily', null, 1],
    ['every_n_days', 3, 3],
    ['weekly', null, 7],
    ['every_n_weeks', 2, 14],
    ['monthly', null, 7],
  ] as const)('%s (interval %s) → %i days', (pattern, interval, expected) => {
    expect(graceWindowDays(pattern, interval)).toBe(expected);
  });

  it('keeps a missed weekly chore visible through day 7, retires it on day 8', () => {
    const dueDate = '2025-06-02'; // Monday
    expect(isWithinGraceWindow('weekly', null, dueDate, '2025-06-09', diffDays)).toBe(true);
    expect(isWithinGraceWindow('weekly', null, dueDate, '2025-06-10', diffDays)).toBe(false);
  });

  it('not-yet-due occurrences are always within window', () => {
    expect(isWithinGraceWindow('daily', null, '2025-06-10', '2025-06-09', diffDays)).toBe(true);
    expect(isWithinGraceWindow('daily', null, '2025-06-10', '2025-06-10', diffDays)).toBe(true);
  });
});

describe('D112 current-turn helpers', () => {
  const rotation = { periodDays: 7, personIds: ['alice', 'bob'] };
  const anchor = '2026-01-05'; // Monday; alice 05–11, bob 12–18

  it('resolves the anchored phase index', () => {
    expect(rotationTurn(rotation, anchor, '2026-01-07', '2026-01-01')).toBe('alice');
    expect(rotationTurn(rotation, anchor, '2026-01-12', '2026-01-01')).toBe('bob');
    expect(rotationTurn(rotation, anchor, '2026-01-18', '2026-01-01')).toBe('bob');
    expect(rotationTurn(rotation, anchor, '2026-01-19', '2026-01-01')).toBe('alice');
  });

  it('wraps negative offsets safely (before the anchor)', () => {
    expect(rotationTurn(rotation, anchor, '2026-01-03', '2026-01-01')).toBe('bob');
  });

  it('returns null outside the rule window', () => {
    expect(rotationTurn(rotation, anchor, '2025-12-31', '2026-01-01')).toBeNull();
    expect(rotationTurn(rotation, anchor, '2026-02-01', '2026-01-01', '2026-01-31')).toBeNull();
  });

  it('ends at the phase boundary (exclusive)', () => {
    expect(rotationTurnEndsAt(anchor, 7, '2026-01-07')).toBe('2026-01-12');
    expect(rotationTurnEndsAt(anchor, 7, '2026-01-12')).toBe('2026-01-19');
  });

  it('a pending occurrence due today wins (This-week-only reassign, §6.3)', () => {
    const turn = currentRotationTurn(rotation, anchor, '2026-01-07', '2026-01-01', null, [
      { dueDate: '2026-01-07', personIds: ['carol'] },
    ]);
    expect(turn?.personId).toBe('carol');
    expect(turn?.endsAt).toBe('2026-01-12');
  });

  it('ignores pending occurrences on other days', () => {
    const turn = currentRotationTurn(rotation, anchor, '2026-01-07', '2026-01-01', null, [
      { dueDate: '2026-01-06', personIds: ['carol'] },
    ]);
    expect(turn?.personId).toBe('alice');
  });

  it('returns null for an empty roster', () => {
    expect(
      currentRotationTurn({ periodDays: 7, personIds: [] }, anchor, '2026-01-07', '2026-01-01'),
    ).toBeNull();
  });
});
