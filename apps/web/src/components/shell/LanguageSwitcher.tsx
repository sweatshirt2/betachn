'use client';

import { useTranslation } from 'react-i18next';
import { LANGUAGE_STORAGE_KEY } from '@/i18n/dictionaries';
import i18n from '@/i18n';

/** Compact EN/አማ toggle for the header (§5.5): instant switch, persisted. */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const isAm = i18n.language === 'am';
  return (
    <div
      className="border-line bg-surface/80 shadow-soft flex shrink-0 items-center rounded-full border p-0.5"
      role="group"
      aria-label={t('settings.language')}
    >
      {(['en', 'am'] as const).map((locale) => {
        const active = i18n.language === locale;
        return (
          <button
            key={locale}
            type="button"
            aria-pressed={active}
            onClick={() => {
              void i18n.changeLanguage(locale);
              try {
                localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
              } catch {
                // non-fatal
              }
            }}
            className={`tap-spring rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
              active ? 'bg-accent-wash text-ink shadow-soft' : 'text-muted'
            }`}
          >
            {locale === 'en' ? 'EN' : 'አማ'}
          </button>
        );
      })}
    </div>
  );
}
