'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/lib/api';
import { useToast } from '@/components/ui';
import { routinesEndpoints } from '../routines.endpoints';
import type { RoutinePayload } from '../routines.types';

export function useRoutines() {
  return useApiQuery<{ routines: RoutinePayload[] }>({
    endpoint: routinesEndpoints.routines,
    key: ['routines'] as const,
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useApiMutation<{ routine: RoutinePayload }, { name: string }>({
    endpoint: routinesEndpoints.createRoutine,
    options: {
      onSuccess: ({ routine }) => {
        void queryClient.invalidateQueries({ queryKey: ['routines'] });
        toast(`${routine.name} added.`);
      },
    },
  });
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient();
  return useApiMutation<{ ok: boolean }, { id: string }>({
    endpoint: routinesEndpoints.deleteRoutine,
    options: { onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['routines'] }) },
  });
}
