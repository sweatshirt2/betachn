import type { Endpoint } from '@/lib/api';

export const suppliesEndpoints = {
  supplies: { method: 'get', path: '/supplies' },
  createSupply: { method: 'post', path: '/supplies' },
  updateSupply: { method: 'patch', path: '/supplies/:id' },
} satisfies Record<string, Endpoint>;
