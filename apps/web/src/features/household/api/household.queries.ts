'use client';

import { useSelector } from 'react-redux';
import { queryKeys, useApiQuery } from '@/lib/api';
import { devicePeople, deviceRoles } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { householdEndpoints } from '../household.endpoints';
import type { PersonPayload, RolePayload } from '../household.types';

export function usePeople() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ people: PersonPayload[] }>({
    endpoint: householdEndpoints.people,
    key: queryKeys.profiles(),
    options: {
      queryFn: mode === 'device' ? () => devicePeople().then((people) => ({ people })) : undefined,
    },
  });
}

export function useRoles() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ roles: RolePayload[] }>({
    endpoint: householdEndpoints.roles,
    key: ['roles'] as const,
    options: {
      queryFn: mode === 'device' ? () => deviceRoles().then((roles) => ({ roles })) : undefined,
    },
  });
}
