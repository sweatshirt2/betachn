'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ApiError, queryKeys, useApiMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import { choresEndpoints } from '../chores.endpoints';
import type { OccurrenceAction, TitledOccurrence } from '../chores.types';

type ActVariables = { id: string } & OccurrenceAction;

/**
 * Occurrence actions with conversational toasts + Undo (reopen ≤10 min by
 * the same actor, §6.6). ALREADY_DONE corrects state with a soft info toast.
 */
export function useOccurrenceAct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    void queryClient.invalidateQueries({ queryKey: ['occurrences'] });
  };

  const reopen = useApiMutation<{ occurrence: TitledOccurrence }, { id: string }>({
    endpoint: choresEndpoints.occurrenceAct,
    options: { onSettled: refresh },
  });

  const act = useApiMutation<{ occurrence: TitledOccurrence }, ActVariables>({
    endpoint: choresEndpoints.occurrenceAct,
    options: {
      onSuccess: ({ occurrence }) => {
        refresh();
        if (occurrence.status === 'completed') {
          toast(`${occurrence.title} completed.`, {
            label: 'Undo',
            run: () => reopen.mutate({ id: occurrence.id }),
          });
        } else {
          toast(`${occurrence.title} updated.`);
        }
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'ALREADY_DONE') {
          refresh();
          toast('Already handled — list refreshed.');
        }
      },
    },
  });

  return act;
}
