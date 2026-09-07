'use client';

import { useSelector } from 'react-redux';
import { useApiQuery } from '@/lib/api';
import { deviceActivity } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { activityEndpoints } from '../activity.endpoints';
import type { ActivityEventPayload } from '../activity.types';

export function useActivity(filters: { member?: string; action?: string } = {}) {
  const mode = useSelector((state: RootState) => state.auth.mode);
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)) as Record<
    string,
    string
  >;
  return useApiQuery<{ events: ActivityEventPayload[]; nextCursor: string | null }>({
    endpoint: activityEndpoints.feed,
    queryParams: params,
    key: ['activity', params] as const,
    options: {
      queryFn:
        mode === 'device'
          ? () => deviceActivity(filters) as Promise<{ events: ActivityEventPayload[]; nextCursor: string | null }>
          : undefined,
    },
  });
}
