import type { Endpoint } from '@/lib/api';

/** URL registry for the chores feature — components never hardcode URLs. */
export const choresEndpoints = {
  today: { method: 'get', path: '/today' },
  occurrences: { method: 'get', path: '/occurrences' },
  occurrenceAct: { method: 'patch', path: '/occurrences/:id' },
  responsibilities: { method: 'get', path: '/responsibilities' },
  createResponsibility: { method: 'post', path: '/responsibilities' },
} satisfies Record<string, Endpoint>;
