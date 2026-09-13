'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/api';
import { AuthArt, Button, Card, Field } from '@/components/ui';
import { useLogin } from '@/features/auth';

/** Official-ish flat Google "G" — brand colors stay literal (brand exception). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.98 11.98 0 0 0 1.29 6.63l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const login = useLogin();
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [meta, setMeta] = useState<{ googleEnabled: boolean; googleClientId: string | null } | null>(null);

  // Static deployment config — public endpoint, safe to read pre-auth.
  useEffect(() => {
    fetch('/api/v1/meta')
      .then((r) => r.json())
      .then((j) => setMeta(j.data))
      .catch(() => setMeta(null));
  }, []);

  function continueWithGoogle() {
    if (!meta?.googleClientId) return;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: meta.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
    });
    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

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
    <main className="bg-page-wash ambient flex min-h-screen w-full flex-col items-center justify-center px-4 py-10">
      {/* Hero: home-with-family art, then the warm welcome copy. */}
      <div className="page-enter flex flex-col items-center">
        <AuthArt variant="welcome" />
        <h1 className="font-display mt-4 text-center text-3xl">{t('auth.welcomeBack')}</h1>
        <p className="text-muted mt-1 text-center text-sm">{t('auth.signInSubtitle')}</p>
      </div>

      <Card className="page-enter mt-6 w-full max-w-sm" style={{ animationDelay: '60ms' }}>
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
        {meta?.googleEnabled && (
          <>
            <div className="text-muted my-3 flex items-center gap-3 text-xs">
              <span className="bg-line h-px flex-1" />
              {t('auth.orContinueWith')}
              <span className="bg-line h-px flex-1" />
            </div>
            <Button tone="quiet" onClick={continueWithGoogle}>
              <span className="mr-1 inline-flex items-center">{<GoogleMark />}</span>
              {t('auth.googleButton')}
            </Button>
          </>
        )}
      </Card>

      <p className="text-muted page-enter mt-5 text-center text-sm" style={{ animationDelay: '120ms' }}>
        {t('auth.newHere')}{' '}
        <Link href="/onboarding" className="text-terracotta font-semibold">
          {t('auth.setupHousehold')}
        </Link>
      </p>
    </main>
  );
}
