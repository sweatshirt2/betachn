import { describe, expect, it } from 'vitest';
import {
  ethiopicMonthLength,
  ethiopicToGregorian,
  gregorianToEthiopic,
  isEthiopicLeap,
} from './calendar';
import { addDays } from './schedule';

describe('ethiopic calendar converter', () => {
  it('reproduces independently documented dates (§16 decision: arithmetic table)', () => {
    // Ethiopian millennium: Meskerem 1, 2000 EC = September 12, 2007 GC.
    expect(gregorianToEthiopic('2007-09-12')).toEqual({ year: 2000, month: 1, day: 1 });
    expect(ethiopicToGregorian(2000, 1, 1)).toBe('2007-09-12');
    // Enkutatash 2018 EC = September 11, 2025 GC.
    expect(gregorianToEthiopic('2025-09-11')).toEqual({ year: 2018, month: 1, day: 1 });
    expect(ethiopicToGregorian(2018, 1, 1)).toBe('2025-09-11');
    // Genna (Christmas): Tahsas 29 = January 7.
    expect(gregorianToEthiopic('2026-01-07')).toEqual({ year: 2018, month: 4, day: 29 });
  });

  it('roundtrips every Gregorian day from 1601 to 2199', { timeout: 30_000 }, () => {
    let iso = '1601-01-01';
    const failures: string[] = [];
    while (iso !== '2200-01-01') {
      const ec = gregorianToEthiopic(iso);
      if (ethiopicToGregorian(ec.year, ec.month, ec.day) !== iso) failures.push(iso);
      iso = addDays(iso, 1);
    }
    expect(failures).toEqual([]);
  });
  it('roundtrips every Ethiopic day of 1892–2108 including Pagume edges', () => {
    for (let year = 1892; year <= 2108; year++) {
      for (const month of [1, 6, 12, 13]) {
        const length = ethiopicMonthLength(year, month);
        for (let day = 1; day <= length; day++) {
          const gcIso = ethiopicToGregorian(year, month, day);
          expect(gregorianToEthiopic(gcIso)).toEqual({ year, month, day });
        }
      }
    }
  });

  it('keeps 30-day months, short Pagume, and the year%4==3 leap rule', () => {
    for (let year = 1800; year <= 2300; year++) {
      for (let month = 1; month <= 12; month++) {
        expect(ethiopicMonthLength(year, month)).toBe(30);
      }
      expect(ethiopicMonthLength(year, 13)).toBe(isEthiopicLeap(year) ? 6 : 5);
      expect(isEthiopicLeap(year)).toBe(year % 4 === 3);
    }
  });

  it('rejects impossible Ethiopic dates', () => {
    expect(() => ethiopicToGregorian(2018, 14, 1)).toThrowError(/month/);
    expect(() => ethiopicToGregorian(2018, 13, 6)).toThrowError(/day/); // 2018 not leap
    expect(ethiopicToGregorian(2019, 13, 6)).toBeTypeOf('string'); // 2019 leap
    expect(() => ethiopicToGregorian(2019, 4, 31)).toThrowError(/day/);
  });
});
