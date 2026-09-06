'use client';

import { useSelector } from 'react-redux';
import { queryKeys, useApiQuery } from '@/lib/api';
import { deviceToday } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { choresEndpoints } from '../chores.endpoints';
import type { ResponsibilityDetail, TodayPayload, TitledOccurrence } from '../chores.types';

/**
 * Today reads branch on session mode (Phase A2): device households compute
 * locally via the shared core aggregate (D49/D64), synced households hit
 * GET /today as before.
 */
export function useToday() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<TodayPayload>({
    endpoint: choresEndpoints.today,
    key: queryKeys.today(),
    options: {
      enabled: mode === 'server',
      queryFn:
        mode === 'device'
          ? () => deviceToday() as Promise<TodayPayload>
          : undefined,
    },
  });
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

export function useResponsibility(id: string) {
  return useApiQuery<ResponsibilityDetail>({
    endpoint: choresEndpoints.responsibilityDetail,
    pathParams: { id },
    key: ['responsibility', id] as const,
  });
}
