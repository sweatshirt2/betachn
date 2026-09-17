'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '@/lib/api/client';
import { evictSession } from './evictSession';
import { markSessionValidated, setSession, type RootState } from '@/store';

/** Minimal /auth/me response shape (full contract lives in features/auth). */
type MeContext = {
  session: { userId: string | null; activePersonId: string };
  username: string | null;
  activePersonName: string;
  household: { id: string; name: string; code: string };
  permissionMap: Record<string, boolean>;
};

/**
 * Boot-time server-session validation (fixes the stale-token loop): a
 * persisted Bearer token is trusted by the whole UI, but the server may have
 * dropped it (session expiry, DB reseed, device wipe) — every query then 401s
 * while the slice still claims "signed in", and useRedirectIfSignedIn bounces
 * the user off /login back into the 401ing app. This hook settles the question
 * exactly once per token:
 *  - device mode: nothing to validate (local-first by definition) → valid
 *  - server mode: GET /auth/me — 200 refreshes the identity snapshot
 *    (permissionMap may have changed), 401 runs the eviction path
 *    (reset + purge + /login), network failure stays neutral (offline-first:
 *    a flaky connection must not log anyone out)
 * Until `validated` is true, session-gated queries stay disabled and
 * useRedirectIfSignedIn holds — the stale-slice lie can no longer steer
 * routing.
 */
export function useSessionValidation(): void {
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.auth.mode);
  const token = useSelector((state: RootState) => state.auth.token);
  const reduxReady = useSelector((state: RootState) => state.auth._persist?.rehydrated ?? false);
  const ranForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!reduxReady) return;
    if (mode === 'device' || token === null) {
      // Device mode validates at rehydrate; signed-out is a settled state.
      dispatch(markSessionValidated());
      return;
    }
    if (ranForToken.current === token) return;
    ranForToken.current = token;
    void api
      .get<never, { context: MeContext }>('/auth/me')
      .then(({ context }) => {
        dispatch(
          setSession({
            token,
            user:
              context.session.userId && context.username
                ? { id: context.session.userId, username: context.username }
                : null,
            activePerson: { id: context.session.activePersonId, name: context.activePersonName },
            household: context.household,
            permissionMap: context.permissionMap,
          }),
        );
        dispatch(markSessionValidated());
      })
      .catch((error: unknown) => {
        const status =
          typeof error === 'object' && error !== null && 'httpStatus' in error
            ? (error as { httpStatus?: number }).httpStatus
            : undefined;
        if (status === 401) {
          // Dead token: the full purge path — reset slice, wipe artifacts,
          // land on /login. validated stays false; nothing gated renders.
          evictSession();
        } else {
          // Network/server hiccup: stay signed in offline-first, unblock UI.
          dispatch(markSessionValidated());
        }
      });
  }, [reduxReady, mode, token, dispatch]);
}
