import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { QueryClient } from '@tanstack/react-query';
import { resetSession, store } from '@/store';

export type ApiErrorBody = {
  code: string;
  message: string;
  missingPermission?: string;
  params?: Record<string, unknown>;
};

/** Thrown for every non-2xx API response; carries the frozen error code (§5.8). */
export class ApiError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly missingPermission?: string;
  readonly params?: Record<string, unknown>;

  constructor(httpStatus: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.httpStatus = httpStatus;
    this.missingPermission = body.missingPermission;
    this.params = body.params;
  }
}

let queryClientRef: QueryClient | null = null;
/** Registered once by Providers — lets the 401 interceptor purge caches. */
export function setQueryClientForApi(client: QueryClient | null): void {
  queryClientRef = client;
}

/** Wholesale cache clear on profile switch / view-as exit / logout (D38). */
export function clearApiCache(): void {
  queryClientRef?.clear();
}

/**
 * Refresh after a sync pull applied remote changes (Phase B1): invalidate
 * every server-data cache so other devices' edits surface without a remount.
 * Deliberately NOT the D38 wholesale clear — identity is untouched; active
 * queries refetch and inactive ones re-resolve from the device DB on mount.
 */
export function invalidateApiCache(): void {
  void queryClientRef?.invalidateQueries();
}

let viewAsOverride: string | null = null;
/**
 * View-as target — normally mirrored from the RTK slice (enterViewAs);
 * the override exists so non-React call sites can preview without dispatch.
 */
export function setViewAsPersonId(id: string | null): void {
  viewAsOverride = id;
}

export const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const auth = store.getState().auth;
  if (auth.token) config.headers.set('Authorization', `Bearer ${auth.token}`);
  const viewAs = viewAsOverride ?? auth.viewAsPersonId;
  if (viewAs) config.headers.set('X-View-As-Person-Id', viewAs);
  return config;
});

api.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error: AxiosError<{ error?: ApiErrorBody }>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data?.error;
    if (status === 401 && body?.code === 'UNAUTHENTICATED') {
      setViewAsPersonId(null);
      store.dispatch(resetSession());
      queryClientRef?.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    if (body) return Promise.reject(new ApiError(status, body));
    return Promise.reject(error);
  },
);
