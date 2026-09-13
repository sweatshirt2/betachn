'use client';

import { useSelector } from 'react-redux';
import type { ParseKeys, TFunction } from 'i18next';
import { BUILTIN_ROLE_KEYS } from '@chorify/core/permissions';
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

/**
 * Display name for a role row: built-ins localize by builtinKey (the wire
 * contract's law — stored `name` text is seed copy, unreliable casing);
 * custom roles render the user-typed name verbatim.
 */
export function roleDisplayName(
  role: { builtinKey: string | null; name: string } | null | undefined,
  t: TFunction<'translation'>,
): string {
  if (role === null || role === undefined) return t('household.noRole');
  const { builtinKey, name } = role;
  if (builtinKey !== null && (BUILTIN_ROLE_KEYS as readonly string[]).includes(builtinKey)) {
    // Narrowed to BUILTIN_ROLE_KEYS members; the Dict enumerates role.<key>
    // for every one of them.
    return t(`role.${builtinKey}` as ParseKeys<'translation'>);
  }
  return name;
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
