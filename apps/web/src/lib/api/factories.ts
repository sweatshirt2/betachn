import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { ApiError, api } from './client';

export type Endpoint = {
  method: 'get' | 'post' | 'patch' | 'delete';
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
  options?: Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'>;
};

/** Generic GET wrapper — feature hooks compose it with registry entries. */
export function useApiQuery<TData>(config: QueryConfig<TData>) {
  return useQuery<TData, ApiError>({
    queryKey: config.key,
    queryFn: async () => {
      const res = await api.get<TData>(fillPath(config.endpoint.path, config.pathParams), {
        params: config.queryParams,
      });
      return res as unknown as TData;
    },
    ...config.options,
  });
}

type MutationConfig<TData, TVariables> = {
  endpoint: Endpoint;
  options?: Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'>;
};

/** Generic mutation wrapper — sync-aware queuing lands here in the sync step. */
export function useApiMutation<TData, TVariables = unknown>(config: MutationConfig<TData, TVariables>) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables) => {
      const { method, path } = config.endpoint;
      if (method === 'post') {
        const res = await api.post<TData>(path, variables);
        return res as unknown as TData;
      }
      if (method === 'patch') {
        const res = await api.patch<TData>(path, variables);
        return res as unknown as TData;
      }
      const res = await api.delete<TData>(path, { data: variables });
      return res as unknown as TData;
    },
    ...config.options,
  });
}
