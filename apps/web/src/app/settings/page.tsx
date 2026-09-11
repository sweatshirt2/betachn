'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Button, Card, Field, useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useLogout } from '@/features/auth';
import { THEME_IDS, useTheme, type ThemeId } from '@/theme';
import { LANGUAGE_STORAGE_KEY, LOCALES } from '@/i18n/dictionaries';
import i18n from '@/i18n';
import { readPasscodeGateState, setPasscodeGate, clearPasscodeGate, MemoryTierError, type PasscodeGateState } from '@/lib/device/passcodeGate';
import type { RootState } from '@/store';

const CALENDAR_STORAGE_KEY = 'chorify-calendar';
type CalendarPref = 'gregorian' | 'ethiopian' | 'both';

/** Theme toggle labels resolve through i18n (EN+AM parity per the AM-parity law). */
const THEME_DICT_KEYS: Record<ThemeId, 'settings.themeFamily' | 'settings.themeEmber' | 'settings.themeHighland' | 'settings.themeGlacier' | 'settings.themeHoney'> = {
  family: 'settings.themeFamily',
  ember: 'settings.themeEmber',
  highland: 'settings.themeHighland',
  glacier: 'settings.themeGlacier',
  honey: 'settings.themeHoney',
};

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
    } catch (err) {
      // micro-67: conflict-class failures get their verbatim copy; the device
      // twin (local import) surfaces its own message.
      if (err instanceof ApiError && err.code === 'IMPORT_CONFLICT') {
        toast(t('settings.importConflict'));
      } else if (err instanceof ApiError && err.code === 'IMPORT_TOO_NEW') {
        toast(t('settings.importTooNew'));
      } else {
        toast(t('settings.importBlocked'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl">{t('settings.title')}</h1>

      <PasscodeSection />

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
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('settings.theme')}>
          {THEME_IDS.map((id) => (
            <Button key={id} tone={theme === id ? 'primary' : 'quiet'} onClick={() => setTheme(id)}>
              {t(THEME_DICT_KEYS[id])}
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

/**
 * Device passcode (D63): optional lock over app entry on THIS device.
 * Gate-only hash in the device DB — synced accounts recover via online
 * sign-in; offline households are warned that forgetting means resetting.
 */
function PasscodeSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const mode = useSelector((state: RootState) => state.auth.mode);
  const [state, setState] = useState<PasscodeGateState | 'checking'>('checking');
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readPasscodeGateState()
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'none' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (passcode.length < 4) {
      toast(t('settings.passcodeTooShort'));
      return;
    }
    if (passcode !== confirm) {
      toast(t('settings.passcodeMismatch'));
      return;
    }
    setBusy(true);
    try {
      await setPasscodeGate(passcode, hint.trim() || null);
      toast(t('settings.passcodeSaved'));
      setPasscode('');
      setConfirm('');
      setHint('');
      setState({ status: 'gate', hint: hint.trim() || null });
    } catch (err) {
      console.error('passcode save failed', err);
      toast(err instanceof MemoryTierError ? t('settings.passcodeNeedsDurable') : t('common.loadError'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await clearPasscodeGate();
      toast(t('settings.passcodeRemoved'));
      setState({ status: 'none' });
      setRemoving(false);
    } finally {
      setBusy(false);
    }
  }

  const locked = state !== 'checking' && state.status === 'gate';

  return (
    <section aria-label={t('settings.passcode')} className="mt-4">
      <h2 className="font-display text-lg">{t('settings.passcode')}</h2>
      <Card className="mt-2 flex flex-col gap-2">
        <p className="text-muted text-xs">
          {mode === 'server' ? t('settings.passcodeExplainSynced') : t('settings.passcodeExplainOffline')}
        </p>
        {state === 'checking' ? null : locked ? (
          <>
            <p className="text-sm font-semibold">{t('settings.passcodeOn')}</p>
            {removing ? (
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => void remove()}>
                  {t('settings.passcodeRemoveConfirm')}
                </Button>
                <Button tone="quiet" onClick={() => setRemoving(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <Button tone="quiet" onClick={() => setRemoving(true)}>
                {t('settings.passcodeRemove')}
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Field
              label={t('settings.passcodeNew')}
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoComplete="new-password"
            />
            <Field
              label={t('settings.passcodeConfirm')}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <Field label={t('settings.passcodeHint')} value={hint} onChange={(e) => setHint(e.target.value)} />
            <Button disabled={busy} onClick={() => void save()}>
              {t('settings.passcodeSave')}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
