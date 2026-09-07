'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { queryKeys, useApiMutation, useDeviceMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import {
  deviceCreatePerson,
  deviceDeletePerson,
  deviceResetRole,
  deviceCreateRole,
  deviceUpdatePerson,
} from '@/lib/device/writes';
import type { RootState } from '@/store';
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
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ person }: { person: PersonPayload }) => {
    invalidate();
    toast(t('activity.personAdded', { name: person.name }));
  };

  const server = useApiMutation<{ person: PersonPayload }, CreatePersonBody>({
    endpoint: householdEndpoints.createPerson,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ person: PersonPayload }, CreatePersonBody>({
    write: (body, identity) => deviceCreatePerson({ ...identity, ...body }).then((person) => ({ person })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function useUpdatePerson() {
  const invalidate = useInvalidatePeople();
  const { toast } = useToast();
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => {
    invalidate();
    toast(t('household.profileUpdated'));
  };

  const server = useApiMutation<{ person: PersonPayload }, { id: string } & UpdatePersonBody>({
    endpoint: householdEndpoints.updatePerson,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ person: PersonPayload }, { id: string } & UpdatePersonBody>({
    write: ({ id, ...body }, identity) =>
      deviceUpdatePerson({ ...identity, personId: id, ...body }).then((person) => ({ person })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function useDeletePerson() {
  const invalidate = useInvalidatePeople();
  const { toast } = useToast();
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  // Destructive — no Undo offered; the toast only confirms.
  const onSuccess = (_: unknown, variables: { name: string }) => {
    invalidate();
    toast(t('household.personRemovedToast', { name: variables.name }));
  };

  const server = useApiMutation<{ ok: boolean }, { id: string; name: string }>({
    endpoint: householdEndpoints.deletePerson,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ ok: boolean }, { id: string; name: string }>({
    write: ({ id }, identity) => deviceDeletePerson({ ...identity, personId: id }),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function useCreateRole() {
  const invalidate = useInvalidatePeople();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => {
    invalidate();
  };

  const server = useApiMutation<{ role: RolePayload }, { name: string }>({
    endpoint: householdEndpoints.createRole,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ role: RolePayload }, { name: string }>({
    write: ({ name }, identity) => deviceCreateRole({ ...identity, name }).then((role) => ({ role })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function useResetRole() {
  const invalidate = useInvalidatePeople();
  const { toast } = useToast();
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => {
    invalidate();
    toast(t('household.permissionsReset'));
  };

  const server = useApiMutation<{ role: RolePayload }, { id: string }>({
    endpoint: householdEndpoints.resetRole,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ role: RolePayload }, { id: string }>({
    write: ({ id }, identity) => deviceResetRole({ ...identity, roleId: id }).then((role) => ({ role })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}
