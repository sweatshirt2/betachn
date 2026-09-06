'use client';

import { useQueryClient } from '@tanstack/react-query';
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
  return useApiMutation<{ person: PersonPayload }, CreatePersonBody>({
    endpoint: householdEndpoints.createPerson,
    options: {
      onSuccess: ({ person }) => {
        invalidate();
        toast(`${person.name} joined the household.`);
      },
    },
  });
}

export function useUpdatePerson() {
  const invalidate = useInvalidatePeople();
  const { toast } = useToast();
  return useApiMutation<{ person: PersonPayload }, { id: string } & UpdatePersonBody>({
    endpoint: householdEndpoints.updatePerson,
    options: {
      onSuccess: () => {
        invalidate();
        toast('Profile updated.');
      },
    },
  });
}

export function useDeletePerson() {
  const invalidate = useInvalidatePeople();
  const { toast } = useToast();
  return useApiMutation<{ ok: boolean }, { id: string; name: string }>({
    endpoint: householdEndpoints.deletePerson,
    options: {
      // Destructive — no Undo offered; the toast only confirms.
      onSuccess: (_, variables) => {
        invalidate();
        toast(`${variables.name} removed.`);
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
  return useApiMutation<{ role: RolePayload }, { id: string }>({
    endpoint: householdEndpoints.resetRole,
    options: {
      onSuccess: () => {
        invalidate();
        toast('Permissions reset to default.');
      },
    },
  });
}
