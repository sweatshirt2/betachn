'use client';

import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { clearApiCache, useApiMutation, useDeviceMutation } from '@/lib/api';
import { resetSession, setSession, setDeviceSession, store } from '@/store';
import { switchDeviceProfile, type DeviceSwitchResult } from '@/lib/device';
import { authEndpoints } from '../auth.endpoints';
import { toAuthState, type AuthContextPayload, type LoginResponse } from '../auth.types';

export function useLogin() {
  const dispatch = useDispatch();
  const router = useRouter();
  return useApiMutation<LoginResponse, { code: string; username: string; password: string }>({
    endpoint: authEndpoints.login,
    options: {
      onSuccess: ({ token, context }) => {
        dispatch(setSession(toAuthState(token, context)));
        router.push('/');
      },
    },
  });
}

/**
 * Continue with Google (D50): exchanges the OAuth authorization code that the
 * /auth/google/callback page captured. Server-mode only — device households
 * are offline-local by definition.
 */
export function useGoogleLogin() {
  const dispatch = useDispatch();
  const router = useRouter();
  return useApiMutation<LoginResponse, { oauthCode: string; redirectUri: string }>({
    endpoint: authEndpoints.google,
    options: {
      onSuccess: ({ token, context }) => {
        dispatch(setSession(toAuthState(token, context)));
        router.push('/');
      },
    },
  });
}

export function useLogout() {
  const dispatch = useDispatch();
  const router = useRouter();
  return useApiMutation<{ ok: boolean }, unknown>({
    endpoint: authEndpoints.logout,
    options: {
      onSettled: () => {
        dispatch(resetSession());
        clearApiCache();
        router.push('/login');
      },
    },
  });
}

export function useSwitchProfile() {
  const dispatch = useDispatch();
  const mode = useSelectorWithMode();

  const server = useApiMutation<
    { session: AuthContextPayload['session']; context: AuthContextPayload },
    { personId: string; password?: string }
  >({
    endpoint: authEndpoints.switchProfile,
    options: {
      // The server mutates the session row — the Bearer token stays valid,
      // so the stored token is preserved while identity fields refresh.
      onSuccess: ({ context }) => {
        dispatch(
          setSession({ ...toAuthState(store.getState().auth.token ?? '', context) }),
        );
        clearApiCache();
      },
    },
  });

  // Device switching is instant (every device person is passwordless, D49);
  // D38 cache-clear keeps stale person-scoped data from leaking across.
  const device = useDeviceMutation<DeviceSwitchResult, { personId: string; password?: string }>({
    write: ({ personId }) => switchDeviceProfile(personId),
    options: {
      onSuccess: (result) => {
        dispatch(setDeviceSession(result));
        clearApiCache();
      },
    },
  });

  return mode === 'device' ? device : server;
}

function useSelectorWithMode(): 'server' | 'device' {
  return useModeSelector();
}

import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
function useModeSelector(): 'server' | 'device' {
  return useSelector((state: RootState) => state.auth.mode);
}
