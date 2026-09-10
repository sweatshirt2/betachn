'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@/components/ui';
import { useGoogleLogin } from '@/features/auth';

/**
 * OAuth redirect target (D50): Google returns ?code=… here; we hand it to
 * POST /auth/google for the server-side exchange. The redirect_uri sent to
 * Google must match the one in the token exchange exactly — hence the fixed
 * origin-relative construction on the login page and here.
 */
export default function GoogleCallbackPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const google = useGoogleLogin();
  const fired = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setFailed(true);
      return;
    }
    google
      .mutateAsync({ oauthCode: code, redirectUri: `${window.location.origin}/auth/google/callback` })
      .catch(() => setFailed(true));
  }, [google]);

  if (failed) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-2xl" aria-hidden>😕</p>
          <p className="text-sm">{t('auth.googleFailed')}</p>
          <Button onClick={() => router.push('/login')}>{t('auth.backToLogin')}</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4">
      <p className="text-muted text-center text-sm">{t('auth.googleFinishing')}…</p>
    </main>
  );
}
