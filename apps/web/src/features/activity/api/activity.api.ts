'use client';

import { useApiQuery } from '@/lib/api';
import { activityEndpoints } from '../activity.endpoints';
import type { ActivityEventPayload } from '../activity.types';

export function useActivity(filters: { member?: string; action?: string } = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)) as Record<
    string,
    string
  >;
  return useApiQuery<{ events: ActivityEventPayload[]; nextCursor: string | null }>({
    endpoint: activityEndpoints.feed,
    queryParams: params,
    key: ['activity', params] as const,
  });
}
