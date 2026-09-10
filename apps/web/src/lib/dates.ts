import i18n from '@/i18n';
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
 * Formats an ISO date per the calendar preference. Gregorian renders as ISO
 * (the app's storage form); Ethiopic uses the core JDN converter with month
 * names from i18n — EN transliteration, full Amharic script in am (§8: month
 * names are copy, never code). 'both' shows "Aug 25 · Meskerem 19".
 */
export function formatDate(iso: string, pref: CalendarPref = readCalendarPref()): string {
  if (pref === 'gregorian') return iso;
  const e = gregorianToEthiopic(iso);
  const eth = `${i18n.t(`cal.m${e.month}`)} ${e.day}`;
  if (pref === 'ethiopian') return eth;
  const greg = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
  return `${greg} · ${eth}`;
}
