'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useApiMutation, useApiQuery, useDeviceMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import { deviceCreateRoutine, deviceDeleteRoutine } from '@/lib/device/writes';
import { deviceRoutines } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { routinesEndpoints } from '../routines.endpoints';
import type { RoutinePayload } from '../routines.types';

export function useRoutines() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ routines: RoutinePayload[] }>({
    endpoint: routinesEndpoints.routines,
    key: ['routines'] as const,
    options: {
      queryFn:
        mode === 'device'
          ? () => deviceRoutines().then((routines) => ({ routines }))
          : undefined,
    },
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ routine }: { routine: RoutinePayload }) => {
    void queryClient.invalidateQueries({ queryKey: ['routines'] });
    toast(t('ops.routineAdded', { name: routine.name }), { kind: 'success' });
  };

  const server = useApiMutation<{ routine: RoutinePayload }, { name: string }>({
    endpoint: routinesEndpoints.createRoutine,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ routine: RoutinePayload }, { name: string }>({
    write: ({ name }, identity) =>
      deviceCreateRoutine({ ...identity, name }).then((routine) => ({ routine })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['routines'] });
  };

  const server = useApiMutation<{ ok: boolean }, { id: string }>({
    endpoint: routinesEndpoints.deleteRoutine,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ ok: boolean }, { id: string }>({
    write: ({ id }, identity) => deviceDeleteRoutine({ ...identity, routineId: id }),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}
