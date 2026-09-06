'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/api';
import { Button, Card, Field } from '@/components/ui';
import { useLogin } from '@/features/auth';

export default function LoginPage() {
  const { t } = useTranslation();
  const login = useLogin();
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const error = login.error;
  const genericError = error instanceof ApiError && error.code === 'UNAUTHENTICATED' ? error.message : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setRetryAfter(null);
    try {
      await login.mutateAsync({ code, username, password });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
        const seconds = err.params?.retryAfterSeconds;
        setRetryAfter(typeof seconds === 'number' ? seconds : 60);
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-center text-3xl">{t('auth.welcomeBack')}</h1>
      <p className="text-muted mt-1 text-center text-sm">{t('auth.signInSubtitle')}</p>
      <Card className="mt-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Field label={t('auth.householdCode')} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" placeholder="BEKELE" />
          <Field label={t('auth.username')} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <Field
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {genericError && (
            <p className="text-clay-red text-sm" role="alert">
              {genericError}
            </p>
          )}
          {retryAfter !== null && (
            <p className="text-mustard text-sm" role="alert">
              {t('auth.rateLimited', { seconds: retryAfter })}
            </p>
          )}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
      </Card>
      <p className="text-muted mt-4 text-center text-sm">
        {t('auth.newHere')}{' '}
        <Link href="/onboarding" className="text-terracotta font-semibold">
          {t('auth.setupHousehold')}
        </Link>
      </p>
    </main>
  );
}
