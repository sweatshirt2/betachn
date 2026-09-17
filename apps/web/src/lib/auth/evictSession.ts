/**
 * Session eviction (§5.8 UNAUTHENTICATED behavior): the ONE purge path used
 * by both the axios 401 interceptor and the sync transport's 401 — reset the
 * RTK session, clear TanStack caches, stash where the user was headed, and
 * land on /login. Idempotent: repeated 401s (parallel queries, the 30s sync
 * tick) must not stack redirects.
 */
import { resetSession, store } from '@/store';
import { isAuthPath, stashReturnTo } from './returnTo';

let evicting = false;

export function evictSession(): void {
  if (typeof window === 'undefined') return;
  if (store.getState().auth.token === null) return; // already signed out
  store.dispatch(resetSession());
  if (queryClientClear !== null) queryClientClear();
  const { pathname, search } = window.location;
  if (!isAuthPath(pathname)) stashReturnTo(pathname, search);
  if (!isAuthPath(pathname)) {
    if (evicting) return;
    evicting = true;
    window.location.assign('/login');
    setTimeout(() => {
      evicting = false;
    }, 1000);
  }
}

let queryClientClear: (() => void) | null = null;
/** Registered once by lib/api — keeps this module decoupled from TanStack. */
export function setQueryClientClearForEvict(clear: (() => void) | null): void {
  queryClientClear = clear;
}
