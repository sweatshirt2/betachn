import type { Endpoint } from '@/lib/api';

export const suppliesEndpoints = {
  supplies: { method: 'get', path: '/supplies' },
  createSupply: { method: 'post', path: '/supplies' },
  updateSupply: { method: 'patch', path: '/supplies/:id' },
  supplyEvents: { method: 'get', path: '/supplies/:id/events' },
  recurringItems: { method: 'get', path: '/recurring-shopping-items' },
  createRecurringItem: { method: 'post', path: '/recurring-shopping-items' },
  updateRecurringItem: { method: 'patch', path: '/recurring-shopping-items/:id' },
  snoozeRecurringItem: { method: 'post', path: '/recurring-shopping-items/:id' },
  archiveRecurringItem: { method: 'delete', path: '/recurring-shopping-items/:id' },
} satisfies Record<string, Endpoint>;
