import { describe, expect, it } from 'vitest';
import { diffDays } from '../../schedule';
import { graceWindowDays, isWithinGraceWindow } from './occurrences.helpers';

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
