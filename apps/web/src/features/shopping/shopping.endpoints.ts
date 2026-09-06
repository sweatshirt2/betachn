import type { Endpoint } from '@/lib/api';

export const shoppingEndpoints = {
  items: { method: 'get', path: '/shopping-items' },
  createItem: { method: 'post', path: '/shopping-items' },
  purchaseItem: { method: 'post', path: '/shopping-items/:id/purchase' },
} satisfies Record<string, Endpoint>;
