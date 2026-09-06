import type { Endpoint } from '@/lib/api';

export const routinesEndpoints = {
  routines: { method: 'get', path: '/routines' },
  createRoutine: { method: 'post', path: '/routines' },
  deleteRoutine: { method: 'delete', path: '/routines/:id' },
} satisfies Record<string, Endpoint>;
