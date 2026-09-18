'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Field, Glyph } from '@/components/ui';
import { clearApiCache } from '@/lib/api';
import { clearPasscodeGate, tryUnlock } from '@/lib/device/passcodeGate';

/**
 * App-entry gate (§4.12/D63): when a passcode gate exists on this device,
 * the shell renders this instead of the app until the passcode verifies.
 * Recovery paths per D63:
 *  - synced account: "sign in online" resets the gate (online re-auth);
 *  - offline household: reset (data loss) — copy warns explicitly.
 */
export function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const { t } = useTranslation();
  const [passcode, setPasscode] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The gate belongs to the device, not the session — clearing the API
    // cache guarantees no pre-lock data lingers in TanStack's memory cache.
    clearApiCache();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      const result = await tryUnlock(passcode);
      if (result.ok) {
        onUnlocked();
      } else {
        setFailed(true);
        setHint(result.hint);
        setPasscode('');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-cream text-ink flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-center text-2xl">
          <Glyph name="lock" className="text-terracotta mr-1.5 inline-block h-6 w-6 align-[-4px]" aria-hidden /> {t('lock.title')}
        </h1>
        <p className="text-muted mt-1 text-center text-sm">{t('lock.subtitle')}</p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <Field
            label={t('lock.passcode')}
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoComplete="off"
            inputMode="text"
          />
          {failed && (
            <p className="text-clay-red text-sm" role="alert">
              {t('lock.wrong')}
              {hint ? ` ${t('lock.hintLabel', { hint })}` : ''}
            </p>
          )}
          <Button type="submit" disabled={busy || passcode.length === 0}>
            {t('lock.unlock')}
          </Button>
        </form>
        <div className="text-muted mt-4 flex flex-col gap-1 text-center text-xs">
          <Link href="/login" className="text-terracotta font-semibold" onClick={() => void clearPasscodeGate()}>
            {t('lock.recoverOnline')}
          </Link>
          <span>{t('lock.recoverWarning')}</span>
        </div>
      </Card>
    </main>
  );
}
