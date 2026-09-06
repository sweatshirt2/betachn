'use client';

import { queryKeys, useApiQuery } from '@/lib/api';
import { householdEndpoints } from '../household.endpoints';
import type { PersonPayload, RolePayload } from '../household.types';

export function usePeople() {
  return useApiQuery<{ people: PersonPayload[] }>({
    endpoint: householdEndpoints.people,
    key: queryKeys.profiles(),
  });
}

export function useRoles() {
  return useApiQuery<{ roles: RolePayload[] }>({
    endpoint: householdEndpoints.roles,
    key: ['roles'] as const,
  });
}
