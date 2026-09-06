import type { Endpoint } from '@/lib/api';

export const activityEndpoints = {
  feed: { method: 'get', path: '/activity' },
} satisfies Record<string, Endpoint>;
