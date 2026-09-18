'use client';

import { useSelector } from 'react-redux';
import { queryKeys, useApiQuery } from '@/lib/api';
import {
  deviceToday,
  deviceOccurrences,
  deviceResponsibilityDetail,
  devicePeople,
  deviceSwaps,
} from '@/lib/device/reads';
import type { RootState } from '@/store';
import { choresEndpoints } from '../chores.endpoints';
import type { OccurrenceSwap, ResponsibilityDetail, TodayPayload, TitledOccurrence } from '../chores.types';

/**
 * Reads branch on session mode (Phase A2/A4): device households compute
 * locally via the shared core aggregate and mirror reads (D49/D64), synced
 * households hit the REST API.
 */
export function useToday() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<TodayPayload>({
    endpoint: choresEndpoints.today,
    key: queryKeys.today(),
    options: {
      enabled: true,
      queryFn:
        mode === 'device'
          ? () => deviceToday() as Promise<TodayPayload>
          : undefined,
    },
  });
}

export function useOccurrences(filters: { from?: string; to?: string; status?: string; personId?: string } = {}) {
  const mode = useSelector((state: RootState) => state.auth.mode);
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)) as Record<
    string,
    string
  >;
  return useApiQuery<{ occurrences: TitledOccurrence[] }>({
    endpoint: choresEndpoints.occurrences,
    queryParams: params,
    key: queryKeys.occurrences(params),
    options: {
      queryFn:
        mode === 'device'
          ? () => deviceOccurrences(filters) as Promise<{ occurrences: TitledOccurrence[] }>
          : undefined,
    },
  });
}

export function useResponsibility(id: string) {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<ResponsibilityDetail>({
    endpoint: choresEndpoints.responsibilityDetail,
    pathParams: { id },
    key: ['responsibility', id] as const,
    options: {
      enabled: id !== '',
      queryFn:
        mode === 'device'
          ? () => deviceResponsibilityDetail(id) as Promise<ResponsibilityDetail>
          : undefined,
    },
  });
}

/** People map shared by the chores pages — device twin of GET /profiles. */
export function usePeopleMap() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ people: Array<{ id: string; name: string; avatarEmoji?: string | null }> }>({
    endpoint: { method: 'get', path: '/profiles' },
    key: queryKeys.profiles(),
    options: {
      queryFn:
        mode === 'device'
          ? () => devicePeople().then((people) => ({ people }))
          : undefined,
    },
  });
}

/** Open (pending) swaps for the active person — §16b / D113. */
export function useSwaps(role: 'incoming' | 'outgoing') {
  const mode = useSelector((state: RootState) => state.auth.mode);
  const activePersonId = useSelector((state: RootState) => {
    const auth = state.auth;
    return auth.viewAsPersonId ?? auth.activePerson?.id ?? '';
  });
  return useApiQuery<{ swaps: OccurrenceSwap[] }>({
    endpoint: choresEndpoints.swaps,
    queryParams: { role },
    key: ['swaps', role] as const,
    options: {
      queryFn:
        mode === 'device'
          ? () => deviceSwaps(role, activePersonId) as Promise<{ swaps: OccurrenceSwap[] }>
          : undefined,
    },
  });
}
