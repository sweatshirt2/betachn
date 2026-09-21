'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { hasSession, type RootState } from '@/store';
import { readPasscodeGateState } from '@/lib/device/passcodeGate';

/**
 * Auth-surface guard (G3): signed-in users never see /login or /onboarding —
 * those pages exist to create or restore a session, and letting a signed-in
 * visitor onto /onboarding could create a SECOND local household that
 * competes with the persisted one (rehydrate resumes the first household
 * row). Replace with the app root as soon as both redux has rehydrated AND
 * the passcode gate is settled:
 *  - before rehydration the gate check would misfire (hasSession is stale);
 *  - a LOCKED signed-in user clicking LockScreen's "recover online" link
 *    must NOT be bounced off /login — that link IS the recovery path (D63),
 *    so an existing gate suppresses the redirect.
 * Chromeless auth pages render children bare (no Shell), so this hook lives
 * in the pages themselves, not the shell.
 */
export function useRedirectIfSignedIn(): void {
  const router = useRouter();
  const signedIn = useSelector((state: RootState) => hasSession(state.auth));
  const sessionValidated = useSelector((state: RootState) => state.auth.sessionValidated);
  const reduxReady = useSelector((state: RootState) => state.auth._persist?.rehydrated ?? false);

  useEffect(() => {
    // sessionValidated guards against the stale-token loop: a persisted token
    // the server no longer recognizes must not redirect the user away from
    // /login — the /auth/me check evicts it instead. Redirect only once the
    // session is rehydrated AND validated (device rehydrate, server /auth/me).
    if (!signedIn || !reduxReady || !sessionValidated) return;
    let cancelled = false;
    void readPasscodeGateState()
      .then((gate) => {
        if (!cancelled && gate.status !== 'gate') router.replace('/');
      })
      .catch(() => {
        // gate read failed (fail-open in the shell too) — do NOT redirect;
        // a misread must never trap a locked user away from recovery.
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, reduxReady, sessionValidated, router]);
}
