'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import i18n from '@/i18n';
import { ToastProvider } from '@/components/ui';
import { setQueryClientForApi } from '@/lib/api';
import { rehydrateDeviceSession } from '@/store';
import { persistor, store } from '@/store';
import type { AppDispatch, RootState } from '@/store';

/** Device-mode sessions re-resolve their permissionMap from live role rows on boot. */
function DeviceSessionRehydrator() {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((state: RootState) => state.auth.mode);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (mode !== 'device' || settled) return;
    setSettled(true);
    void dispatch(rehydrateDeviceSession());
  }, [mode, settled, dispatch]);

  return null;
}

function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production') return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline shell is progressive enhancement — never break boot.
    });
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );

  useEffect(() => {
    setQueryClientForApi(queryClient);
    return () => setQueryClientForApi(null);
  }, [queryClient]);

  registerServiceWorker();

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ToastProvider>
              <DeviceSessionRehydrator />
              {children}
            </ToastProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
