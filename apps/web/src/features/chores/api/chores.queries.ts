'use client';

import { queryKeys, useApiQuery } from '@/lib/api';
import { choresEndpoints } from '../chores.endpoints';
import type { TodayPayload, TitledOccurrence } from '../chores.types';

export function useToday() {
  return useApiQuery<TodayPayload>({ endpoint: choresEndpoints.today, key: queryKeys.today() });
}

export function useOccurrences(filters: { from?: string; to?: string; status?: string } = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)) as Record<
    string,
    string
  >;
  return useApiQuery<{ occurrences: TitledOccurrence[] }>({
    endpoint: choresEndpoints.occurrences,
    queryParams: params,
    key: queryKeys.occurrences(params),
  });
}
