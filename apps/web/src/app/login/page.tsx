'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/api';
import { useRedirectIfSignedIn } from '@/lib/auth/useRedirectIfSignedIn';
import {
  readLastHouseholdCode,
  readRememberedNames,
  rememberHouseholdCode,
  rememberName,
} from '@/lib/auth/rememberedLogin';
import { AuthArt, Button, Card, Field, PersonAvatar } from '@/components/ui';
import { useGoogleLogin, useHouseholdPreview, useLogin, type HouseholdPreviewResponse } from '@/features/auth';

/**
 * Step-down login (D101): code → face grid → password.
 *  - Cold device: the code form asks for the household; faces resolve from
 *    POST /auth/household-preview.
 *  - Warm device: the remembered code resolves the faces automatically —
 *    zero typed fields.
 *  - Passwordless faces sign in via profile-switch semantics handled by the
 *    login mutation's username prefill; credentialed faces demand a password
 *    (prefilled username from memory).
 * The full-triple /auth/login contract (D52/D53) is unchanged — the server
 * never learns the UI's step shape.
 */

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

type Step = 'code' | 'faces' | 'password';

export default function LoginPage() {
  const { t } = useTranslation();
  // Signed-in visitors have no business here — except a LOCKED one recovering
  // via online sign-in (D63); the hook suppresses the redirect while a gate exists.
  useRedirectIfSignedIn();

  const login = useLogin();
  const google = useGoogleLogin();
  const preview = useHouseholdPreview();

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [faces, setFaces] = useState<HouseholdPreviewResponse['faces']>([]);
  const [chosen, setChosen] = useState<{ personId: string; name: string; hasPassword: boolean } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [meta, setMeta] = useState<{ googleEnabled: boolean; googleClientId: string | null } | null>(null);

  /** Stable crayon per face — list position, matching the in-app member order. */
  function faceIndex(personId: string): number {
    return faces.findIndex((f) => f.personId === personId);
  }

  // Warm device: a remembered code resolves the face grid on mount (D101) —
  // cold devices just see the code form.
  useEffect(() => {
    const remembered = readLastHouseholdCode();
    if (remembered && /^[A-Z]{6}$/.test(remembered)) {
      setCode(remembered);
      preview.mutate(
        { code: remembered },
        {
          onSuccess: (data) => {
            setHouseholdName(data.householdName);
            setFaces(data.faces);
            setStep('faces');
          },
          onError: () => {
            // Stale code (household deleted, typo fixed since) — cold start.
            setStep('code');
          },
        },
      );
    }
    // Static deployment config — public endpoint, safe to read pre-auth.
    fetch('/api/v1/meta')
      .then((r) => r.json())
      .then((j) => setMeta(j.data))
      .catch(() => setMeta(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resolveCode(event: React.FormEvent) {
    event.preventDefault();
    setRetryAfter(null);
    preview.mutate(
      { code },
      {
        onSuccess: (data) => {
          rememberHouseholdCode(code.toUpperCase());
          setHouseholdName(data.householdName);
          setFaces(data.faces);
          setStep('faces');
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
            const seconds = err.params?.retryAfterSeconds;
            setRetryAfter(typeof seconds === 'number' ? seconds : 60);
          }
        },
      },
    );
  }

  function pickFace(face: { personId: string; name: string; hasPassword: boolean }) {
    setChosen(face);
    if (face.hasPassword) {
      // Prefill the remembered username for this face — typing is the fallback.
      const names = readRememberedNames(code.toUpperCase());
      setUsername(names[face.personId] ?? face.name);
      setStep('password');
    } else {
      // Passwordless face — username is the face's name; the login triple
      // still carries it (D53 server contract unchanged).
      setStep('password');
      setPassword('');
      setUsername(face.name);
    }
  }

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

  const error = login.error ?? preview.error;
  const genericError = error instanceof ApiError && error.code === 'UNAUTHENTICATED' ? error.message : null;
  const notFound = error instanceof ApiError && error.code === 'NOT_FOUND';
  const busy = preview.isPending || login.isPending;

  async function onPasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setRetryAfter(null);
    if (chosen) rememberName(code.toUpperCase(), chosen.personId, username);
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
      <div className="page-enter flex flex-col items-center">
        <AuthArt variant="welcome" />
        <h1 className="font-display mt-4 text-center text-3xl">{t('auth.welcomeBack')}</h1>
        <p className="text-muted mt-1 text-center text-sm">
          {step === 'faces' ? t('auth.pickYourFace') : t('auth.signInSubtitle')}
        </p>
      </div>

      {step === 'code' && (
        <Card className="page-enter mt-6 w-full max-w-sm" style={{ animationDelay: '60ms' }}>
          <form onSubmit={resolveCode} className="flex flex-col gap-3">
            <h2 className="font-display text-lg">{t('auth.enterCodeTitle')}</h2>
            <Field
              label={t('auth.householdCode')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              placeholder="BEKELE"
            />
            {notFound && (
              <p className="text-clay-red text-sm" role="alert">
                {t('auth.codeNotFound')}
              </p>
            )}
            {retryAfter !== null && (
              <p className="text-mustard text-sm" role="alert">
                {t('auth.rateLimited', { seconds: retryAfter })}
              </p>
            )}
            <Button type="submit" disabled={busy || code.trim().length === 0}>
              {busy ? t('auth.signingIn') : t('auth.continueLabel')}
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
      )}

      {step === 'faces' && (
        <Card className="page-enter mt-6 w-full max-w-sm" style={{ animationDelay: '60ms' }}>
          <h2 className="font-display text-center text-lg">
            {householdName.length > 0 ? householdName : t('auth.pickYourFace')}
          </h2>
          <p className="text-muted mt-1 text-center text-xs">{t('auth.whoAreYou')}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {faces.map((face) => (
              <button
                key={face.personId}
                type="button"
                className="tap-spring flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-surface-alt"
                onClick={() => pickFace(face)}
              >
                <PersonAvatar name={face.name} index={faceIndex(face.personId)} size="lg" />
                <span className="w-full truncate text-center text-xs font-semibold">{face.name}</span>
              </button>
            ))}
          </div>
          <div className="text-muted mt-4 flex items-center justify-between text-xs">
            <button className="underline" onClick={() => setStep('code')}>
              {t('auth.differentCode')}
            </button>
            {meta?.googleEnabled && (
              <Button tone="quiet" onClick={continueWithGoogle}>
                <span className="mr-1 inline-flex items-center">{<GoogleMark />}</span>
                {t('auth.googleButton')}
              </Button>
            )}
          </div>
        </Card>
      )}

      {step === 'password' && chosen && (
        <Card className="page-enter mt-6 w-full max-w-sm" style={{ animationDelay: '60ms' }}>
          <div className="flex flex-col items-center">
            <PersonAvatar
              name={chosen.name}
              index={faceIndex(chosen.personId)}
              size="lg"
            />
            <p className="text-muted mt-2 text-sm">{t('auth.notYou', { name: chosen.name })}</p>
            <button className="text-terracotta text-xs font-semibold underline" onClick={() => setStep('faces')}>
              {t('auth.pickYourFace')}
            </button>
          </div>
          <form onSubmit={onPasswordSubmit} className="mt-4 flex flex-col gap-3">
            <Field
              label={t('auth.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <Field
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
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
            <Button type="submit" disabled={busy || password.length === 0}>
              {busy ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>
          <div className="text-muted mt-3 text-center text-xs">
            <button className="underline" onClick={() => setStep('code')}>
              {t('auth.useCodeInstead')}
            </button>
          </div>
        </Card>
      )}

      <p className="text-muted page-enter mt-5 text-center text-sm" style={{ animationDelay: '120ms' }}>
        {t('auth.newHere')}{' '}
        <Link href="/onboarding" className="text-terracotta font-semibold">
          {t('auth.setupHousehold')}
        </Link>
      </p>
    </main>
  );
}
