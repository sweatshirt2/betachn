import type { Endpoint } from '@/lib/api';

export const suppliesEndpoints = {
  supplies: { method: 'get', path: '/supplies' },
  createSupply: { method: 'post', path: '/supplies' },
  updateSupply: { method: 'patch', path: '/supplies/:id' },
  supplyEvents: { method: 'get', path: '/supplies/:id/events' },
} satisfies Record<string, Endpoint>;
