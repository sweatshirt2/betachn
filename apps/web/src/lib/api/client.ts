import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { QueryClient } from '@tanstack/react-query';
import { evictSession, setQueryClientClearForEvict } from '@/lib/auth/evictSession';
import { store } from '@/store';

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
  // Keep the eviction helper in sync — it must never import this module
  // (circular: client → evictSession → store, and client needs evictSession).
  setQueryClientClearForEvict(client === null ? null : () => client.clear());
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
    // §5.8: 401 purges the session and lands on /login — silent, no toast.
    // Default is EVICT for every 401, including foreign ones with no Chorify
    // envelope (deploy-protection proxies, gateways, HTML error pages): a
    // 401 that isn't a deliberate app-level flow must never wedge the app.
    // The only exemptions are the two app 401s that are form flows, not
    // session states — PASSWORD_REQUIRED / WRONG_PASSWORD (profile switch
    // gate, login form); evicting on those would loop the user mid-form.
    // Permission failures arrive as 403 FORBIDDEN / VIEW_AS_READONLY and
    // never touch this path.
    const isDeliberateForm401 = body?.code === 'PASSWORD_REQUIRED' || body?.code === 'WRONG_PASSWORD';
    if (status === 401 && !isDeliberateForm401) {
      setViewAsPersonId(null);
      evictSession();
    }
    if (body) return Promise.reject(new ApiError(status, body));
    return Promise.reject(error);
  },
);
