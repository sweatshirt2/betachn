import { parseISO, toISO } from './schedule';

/**
 * Gregorian ↔ Ethiopic conversion by pure arithmetic (§16.2 decision — Node
 * ICU lacks the ethiopic calendar). Integer JDN math, exact for the whole
 * proleptic range we care about; no Date object ever touches the math.
 *
 * Ethiopian calendar: 12 × 30-day months + Pagume (13th) of 5 days,
 * 6 in leap years; leap every year where `year % 4 === 3`; EC year =
 * GC year − 7 (until ~Jan 10) else − 8. Amete Mihret epoch JDN 1723856
 * (Beyene–Kudlek).
 */

const ETHIOPIC_EPOCH_JDN = 1_724_221;
/** Ethiopic month names live in the i18n dictionary — never here (AGENTS §8). */
export interface EthiopicDate {
  year: number;
  /** 1–12 = the 30-day months, 13 = Pagume. */
  month: number;
  day: number;
}

function gregorianToJdn(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32_045
  );
}

function jdnToGregorian(jdn: number): string {
  const a = jdn + 32_044;
  const b = Math.floor((4 * a + 3) / 146_097);
  const c = a - Math.floor((146_097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return toISO(new Date(Date.UTC(year, month - 1, day)).getTime());
}

export function ethiopicToJdn(year: number, month: number, day: number): number {
  return ETHIOPIC_EPOCH_JDN + yearStartLinear(year) + 30 * (month - 1) + (day - 1);
}
/**
 * Exact inverse of {@link ethiopicToJdn}: estimate the year from the mean
 * year length, then walk to the largest year whose start does not exceed
 * the JDN. Consistent with the forward formula by construction.
 */
export function jdnToEthiopic(jdn: number): EthiopicDate {
  const linear = jdn - ETHIOPIC_EPOCH_JDN;
  const estimate = Math.floor(linear / 365.25);
  let year = estimate;
  while (yearStartLinear(year + 1) <= linear) year++;
  while (year > estimate - 3 && yearStartLinear(year) > linear) year--;

  let remainder = linear - yearStartLinear(year);
  let month = Math.floor(remainder / 30) + 1;
  if (month > 13) {
    month = 13;
    remainder = 360;
  }
  return { year, month, day: (remainder % 30) + 1 };
}

/** Linear offset of Ethiopic New Year for `year`, relative to the epoch. */
function yearStartLinear(year: number): number {
  return 365 * (year - 1) + Math.floor(year / 4);
}


/** ISO Gregorian ('YYYY-MM-DD') → Ethiopic date. */
export function gregorianToEthiopic(iso: string): EthiopicDate {
  return jdnToEthiopic(gregorianToJdn(iso));
}

/** Ethiopic date → ISO Gregorian. Throws outside 1–13 months / month length. */
export function ethiopicToGregorian(year: number, month: number, day: number): string {
  if (!Number.isInteger(year) || year < 1) throw new Error(`Invalid Ethiopic year: ${year}`);
  if (!Number.isInteger(month) || month < 1 || month > 13) {
    throw new Error(`Invalid Ethiopic month: ${month}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > ethiopicMonthLength(year, month)) {
    throw new Error(`Invalid Ethiopic day: ${year}-${month}-${day}`);
  }
  return jdnToGregorian(ethiopicToJdn(year, month, day));
}

export function isEthiopicLeap(year: number): boolean {
  return year % 4 === 3;
}

export function ethiopicMonthLength(year: number, month: number): number {
  if (month >= 1 && month <= 12) return 30;
  return isEthiopicLeap(year) ? 6 : 5;
}
