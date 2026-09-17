import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { hasSession, type RootState } from '@/store';
import { ApiError, api } from './client';

export type Endpoint = {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  /** Path template, e.g. `/occurrences/:id`. URLs never hardcode in components. */
  path: string;
};

function fillPath(template: string, params: Record<string, string> = {}): string {
  let out = template;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`:${key}`, encodeURIComponent(value));
  }
  return out;
}

type QueryConfig<TData> = {
  endpoint: Endpoint;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  key: readonly unknown[];
  /**
   * queryFn may be overridden for device-mode reads (Phase A2) — server
   * households always go through the axios path.
   */
  options?: Omit<UseQueryOptions<TData, ApiError>, 'queryKey'>;
};

/**
 * True only when a session exists AND has been validated this boot (§6
 * stale-token guard): a rehydrated Bearer the server no longer recognizes
 * must not fire the app's query swarm — /auth/me settles it first, and the
 * 401 path evicts. Device sessions validate at device rehydrate; signed-out
 * is settled too (queries stay disabled behind the SignedOutDoor).
 */
export function useSessionReady(): boolean {
  return useSelector((state: RootState) => hasSession(state.auth) && state.auth.sessionValidated);
}

/** Generic GET wrapper — feature hooks compose it with registry entries. */
export function useApiQuery<TData>(config: QueryConfig<TData>) {
  // Device-mode hooks pass `queryFn: mode === 'device' ? deviceFn : undefined`.
  // Spreading `{ queryFn: undefined }` would CLOBBER the axios fetcher below,
  // leaving server-mode queries with no fetcher (eternal skeleton) — so the
  // override is destructured out and only applied when actually defined.
  const { queryFn: deviceQueryFn, ...restOptions } = config.options ?? {};
  // Central session gate: no query fires until the boot-time /auth/me check
  // has settled (or the session is device-mode/rehydrated). Callers can
  // further restrict with their own `enabled`, never widen it.
  const sessionReady = useSessionReady();
  return useQuery<TData, ApiError>({
    queryKey: config.key,
    queryFn:
      deviceQueryFn ??
      (async () => {
        const res = await api.get<TData>(fillPath(config.endpoint.path, config.pathParams), {
          params: config.queryParams,
        });
        return res as unknown as TData;
      }),
    ...restOptions,
    enabled: sessionReady && (restOptions.enabled ?? true),
  });
}

type MutationConfig<TData, TVariables> = {
  endpoint: Endpoint;
  /** Fill `:param` segments from the mutation variables (default: `id`). */
  pathParams?: (variables: TVariables) => Record<string, string>;
  options?: Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'>;
};

/** Generic mutation wrapper — sync-aware queuing lands here in the sync step. */
export function useApiMutation<TData, TVariables = unknown>(config: MutationConfig<TData, TVariables>) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables) => {
      let params: Record<string, string> = {};
      if (config.pathParams) {
        params = config.pathParams(variables);
      } else {
        const maybeId = (variables as { id?: unknown }).id;
        if (typeof maybeId === 'string') params = { id: maybeId };
      }
      const path = fillPath(config.endpoint.path, params);
      const { method } = config.endpoint;
      if (method === 'post') {
        const res = await api.post<TData>(path, variables);
        return res as unknown as TData;
      }
      if (method === 'patch') {
        const res = await api.patch<TData>(path, variables);
        return res as unknown as TData;
      }
      if (method === 'put') {
        const res = await api.put<TData>(path, variables);
        return res as unknown as TData;
      }
      const res = await api.delete<TData>(path, { data: variables });
      return res as unknown as TData;
    },
    ...config.options,
  });
}
