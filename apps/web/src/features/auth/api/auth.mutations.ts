'use client';

import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { clearApiCache, useApiMutation } from '@/lib/api';
import { resetSession, setSession, store } from '@/store';
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
  return useApiMutation<
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
}
