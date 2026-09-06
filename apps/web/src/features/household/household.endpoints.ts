import type { Endpoint } from '@/lib/api';

/** URL registry for the household feature — components never hardcode URLs. */
export const householdEndpoints = {
  people: { method: 'get', path: '/people' },
  createPerson: { method: 'post', path: '/people' },
  updatePerson: { method: 'patch', path: '/people/:id' },
  deletePerson: { method: 'delete', path: '/people/:id' },
  roles: { method: 'get', path: '/roles' },
  createRole: { method: 'post', path: '/roles' },
  updateRole: { method: 'patch', path: '/roles/:id' },
  deleteRole: { method: 'delete', path: '/roles/:id' },
  resetRole: { method: 'post', path: '/roles/:id/reset' },
} satisfies Record<string, Endpoint>;
