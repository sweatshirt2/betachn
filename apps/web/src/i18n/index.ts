import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LANGUAGE_STORAGE_KEY, am, en, type Locale } from './dictionaries';

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'am' || stored === 'en') return stored;
  } catch {
    // ignore — default below
  }
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, am: { translation: am } },
  lng: typeof window === 'undefined' ? 'en' : initialLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
export { LANGUAGE_STORAGE_KEY };
export type { Locale };
