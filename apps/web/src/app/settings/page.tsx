'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Button, Card, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { useLogout } from '@/features/auth';
import { THEME_IDS, THEME_LABELS, useTheme } from '@/theme';
import { LANGUAGE_STORAGE_KEY, LOCALES } from '@/i18n/dictionaries';
import i18n from '@/i18n';
import type { RootState } from '@/store';

const CALENDAR_STORAGE_KEY = 'chorify-calendar';
type CalendarPref = 'gregorian' | 'ethiopian' | 'both';

function readCalendar(): CalendarPref {
  try {
    const v = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (v === 'ethiopian' || v === 'both' || v === 'gregorian') return v;
  } catch {
    // ignore
  }
  return 'gregorian';
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  const household = useSelector((state: RootState) => state.auth.household);
  const [calendar, setCalendar] = useState<CalendarPref>(readCalendar);
  const [busy, setBusy] = useState(false);

  function pickCalendar(pref: CalendarPref) {
    setCalendar(pref);
    try {
      localStorage.setItem(CALENDAR_STORAGE_KEY, pref);
    } catch {
      // non-fatal
    }
  }

  async function exportHousehold() {
    setBusy(true);
    try {
      const res = await api.get('/export/household.txt', { responseType: 'blob' });
      const url = URL.createObjectURL(res as unknown as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `My-Household-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast(t('settings.exportSaved'));
    } catch {
      toast(t('settings.exportFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function importHousehold(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      await api.post('/import', text, { headers: { 'content-type': 'text/plain' } });
      toast(t('settings.importOpened'));
    } catch {
      toast(t('settings.importBlocked'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl">{t('settings.title')}</h1>

      <section aria-label={t('settings.language')} className="mt-4">
        <h2 className="font-display text-lg">{t('settings.language')} / ቋንቋ</h2>
        <div className="mt-2 flex gap-2">
          {LOCALES.map((locale) => (
            <Button
              key={locale}
              tone={i18n.language === locale ? 'primary' : 'quiet'}
              onClick={() => {
                void i18n.changeLanguage(locale);
                try {
                  localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
                } catch {
                  // non-fatal
                }
              }}
            >
              {locale === 'en' ? 'English' : 'አማርኛ'}
            </Button>
          ))}
        </div>
      </section>

      <section aria-label={t('settings.theme')} className="mt-4">
        <h2 className="font-display text-lg">{t('settings.theme')}</h2>
        <div className="mt-2 flex gap-2" role="group" aria-label={t('settings.theme')}>
          {THEME_IDS.map((id) => (
            <Button key={id} tone={theme === id ? 'primary' : 'quiet'} onClick={() => setTheme(id)}>
              {THEME_LABELS[id]}
            </Button>
          ))}
        </div>
      </section>

      <section aria-label={t('settings.calendar')} className="mt-4">
        <h2 className="font-display text-lg">{t('settings.calendar')}</h2>
        <div className="mt-2 flex gap-2">
          {(['gregorian', 'ethiopian', 'both'] as CalendarPref[]).map((pref) => (
            <Button key={pref} tone={calendar === pref ? 'primary' : 'quiet'} onClick={() => pickCalendar(pref)}>
              {pref === 'gregorian' ? t('settings.gregorian') : pref === 'ethiopian' ? t('settings.ethiopian') : t('settings.both')}
            </Button>
          ))}
        </div>
      </section>

      {household && (
        <section aria-label={t('settings.household')} className="mt-4">
          <h2 className="font-display text-lg">{t('settings.household')}</h2>
          <Card className="mt-2">
            <p className="text-sm font-semibold">{household.name}</p>
            <p className="text-muted text-xs">{t('settings.codeShare', { code: household.code })}</p>
          </Card>
        </section>
      )}

      <section aria-label={t('settings.backup')} className="mt-4">
        <h2 className="font-display text-lg">{t('settings.backup')}</h2>
        <Card className="mt-2 flex flex-col gap-2">
          <Button tone="quiet" disabled={busy} onClick={exportHousehold}>
            {t('settings.saveCopy')}
          </Button>
          <label className="bg-surface text-ink border-line cursor-pointer rounded-md border px-4 py-2 text-center text-sm font-semibold">
            {t('settings.openCopy')}
            <input
              type="file"
              accept=".txt"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importHousehold(file);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-muted text-xs">{t('settings.noPasswords')}</p>
        </Card>
      </section>

      <div className="mt-6">
        <Button tone="quiet" disabled={logout.isPending} onClick={() => logout.mutate({})}>
          {t('settings.signOut')}
        </Button>
      </div>
    </div>
  );
}
