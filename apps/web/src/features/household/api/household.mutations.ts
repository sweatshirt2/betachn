'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryKeys, useApiMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import { householdEndpoints } from '../household.endpoints';
import type { CreatePersonBody, PersonPayload, RolePayload, UpdatePersonBody } from '../household.types';

function useInvalidatePeople() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.profiles() });
    void queryClient.invalidateQueries({ queryKey: ['roles'] });
  };
}

export function useCreatePerson() {
  const invalidate = useInvalidatePeople();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useApiMutation<{ person: PersonPayload }, CreatePersonBody>({
    endpoint: householdEndpoints.createPerson,
    options: {
      onSuccess: ({ person }) => {
        invalidate();
        toast(t('activity.personAdded', { name: person.name }));
      },
    },
  });
}

export function useUpdatePerson() {
  const invalidate = useInvalidatePeople();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useApiMutation<{ person: PersonPayload }, { id: string } & UpdatePersonBody>({
    endpoint: householdEndpoints.updatePerson,
    options: {
      onSuccess: () => {
        invalidate();
        toast(t('household.profileUpdated'));
      },
    },
  });
}

export function useDeletePerson() {
  const invalidate = useInvalidatePeople();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useApiMutation<{ ok: boolean }, { id: string; name: string }>({
    endpoint: householdEndpoints.deletePerson,
    options: {
      // Destructive — no Undo offered; the toast only confirms.
      onSuccess: (_, variables) => {
        invalidate();
        toast(t('household.personRemovedToast', { name: variables.name }));
      },
    },
  });
}

export function useCreateRole() {
  const invalidate = useInvalidatePeople();
  return useApiMutation<{ role: RolePayload }, { name: string }>({
    endpoint: householdEndpoints.createRole,
    options: { onSuccess: invalidate },
  });
}

export function useResetRole() {
  const invalidate = useInvalidatePeople();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useApiMutation<{ role: RolePayload }, { id: string }>({
    endpoint: householdEndpoints.resetRole,
    options: {
      onSuccess: () => {
        invalidate();
        toast(t('household.permissionsReset'));
      },
    },
  });
}
