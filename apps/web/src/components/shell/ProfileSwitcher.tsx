'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/api';
import { Button, Field, Sheet } from '@/components/ui';
import { useSwitchProfile } from '@/features/auth';
import { usePeople } from '@/features/household';

/**
 * Avatar-chip sheet: every member, instant switch for passwordless
 * profiles, inline password gate for credentialed ones (§4.6).
 */
export function ProfileSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const people = usePeople();
  const switchMut = useSwitchProfile();
  const { t } = useTranslation();
  const [gatedId, setGatedId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);

  const error = switchMut.error;
  const needsPassword =
    gatedId !== null || (error instanceof ApiError && error.code === 'PASSWORD_REQUIRED');
  const wrongPassword = failed || (error instanceof ApiError && error.code === 'WRONG_PASSWORD');

  if (switchMut.isSuccess && open) {
    onClose();
    switchMut.reset();
  }

  function pick(personId: string) {
    setGatedId(null);
    setPassword('');
    setFailed(false);
    switchMut.reset();
    switchMut.mutate(
      { personId },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'PASSWORD_REQUIRED') setGatedId(personId);
          if (err instanceof ApiError && err.code === 'WRONG_PASSWORD') setFailed(true);
        },
      },
    );
  }

  function submitPassword() {
    if (!gatedId) return;
    setFailed(false);
    switchMut.mutate(
      { personId: gatedId, password },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'WRONG_PASSWORD') setFailed(true);
        },
      },
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('auth.switchProfile')}>
      <div className="flex flex-col gap-2">
        {(people.data?.people ?? []).map((p) => (
          <div key={p.id}>
            <button
              className="bg-surface text-ink border-line flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left"
              onClick={() => pick(p.id)}
              disabled={switchMut.isPending}
            >
              <span className="text-2xl" aria-hidden>
                {p.avatarEmoji}
              </span>
              <span className="font-semibold">{p.name}</span>
            </button>
            {needsPassword && gatedId === p.id && (
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitPassword();
                }}
              >
                <Field
                  label={t('auth.passwordFor', { name: p.name })}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={wrongPassword ? t('auth.wrongPassword') : undefined}
                />
                <Button type="submit" disabled={switchMut.isPending || password.length === 0}>
                  {t('common.go')}
                </Button>
              </form>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
}
