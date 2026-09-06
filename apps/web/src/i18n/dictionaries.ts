/**
 * Typed i18n dictionaries — EN + full AM parity required (AGENTS.md §8).
 * A missing Amharic entry is a bug: `Dict` is fully concrete (no
 * `Record<string, string>`), so `am` must carry every key `en` has.
 * Skeleton only — full screen copy lands in step 18.
 */
export type Dict = {
  common: {
    appName: string;
    loading: string;
    retry: string;
    cancel: string;
    save: string;
  };
};

export const en: Dict = {
  common: {
    appName: 'Chorify',
    loading: 'Loading…',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
  },
};

export const am: Dict = {
  common: {
    appName: 'ቾሪፋይ',
    loading: 'በመጫን ላይ…',
    retry: 'እንደገና ሞክር',
    cancel: 'ሰርዝ',
    save: 'አስቀምጥ',
  },
};

export type Locale = 'en' | 'am';
export const LOCALES: Locale[] = ['en', 'am'];
export const LANGUAGE_STORAGE_KEY = 'chorify-language';
