import i18n from '@/i18n';
import type { ParseKeys } from 'i18next';
import { gregorianToEthiopic } from '@chorify/core/calendar';

/** Calendar display preference (§5.2), stored by Settings. */
export type CalendarPref = 'gregorian' | 'ethiopian' | 'both';

const STORAGE_KEY = 'chorify-calendar';

export function readCalendarPref(): CalendarPref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'ethiopian' || v === 'both' || v === 'gregorian') return v;
  } catch {
    // ignore
  }
  return 'gregorian';
}

/**
 * Formats an ISO date per the calendar preference. Gregorian renders as a
 * friendly locale label ("Sep 14" — never the raw storage ISO on screen);
 * Ethiopic uses the core JDN converter with month names from i18n — EN
 * transliteration, full Amharic script in am (§8: month names are copy, never
 * code). 'both' shows "Aug 25 · Meskerem 19". Falls back to the raw ISO only
 * if Intl itself fails.
 */
export function formatDate(iso: string, pref: CalendarPref = readCalendarPref()): string {
  if (pref === 'gregorian') return gregorianLabel(iso);
  const e = gregorianToEthiopic(iso);
  // Month keys are enumerated cal.m1–m13 in the Dict; the converter always
  // yields 1–13, so the cast is sound (typed-i18n runtime guarantee).
  const monthKey = `cal.m${e.month}` as ParseKeys<'translation'>;
  const eth = `${i18n.t(monthKey)} ${e.day}`;
  if (pref === 'ethiopian') return eth;
  return `${gregorianLabel(iso)} · ${eth}`;
}

function gregorianLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat(i18n.language === 'am' ? 'am' : 'en', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}
