'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiError, queryKeys, useApiMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import { choresEndpoints } from '../chores.endpoints';
import type { CreateResponsibilityBody, OccurrenceAction, TitledOccurrence } from '../chores.types';

type ActVariables = { id: string } & OccurrenceAction;

/**
 * Occurrence actions with conversational toasts + Undo (reopen ≤10 min by
 * the same actor, §6.6). ALREADY_DONE corrects state with a soft info toast.
 */
export function useOccurrenceAct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

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
          toast(t('activity.occurrenceCompleted', { title: occurrence.title }), {
            label: t('common.undo'),
            run: () => reopen.mutate({ id: occurrence.id }),
          });
        } else {
          toast(t('chores.updatedToast', { title: occurrence.title }));
        }
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'ALREADY_DONE') {
          refresh();
          toast(t('chores.alreadyHandled'));
        }
      },
    },
  });

  return act;
}

export function useCreateResponsibility() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useApiMutation<{ responsibility: { id: string; title: string } }, CreateResponsibilityBody>({
    endpoint: choresEndpoints.createResponsibility,
    options: {
      onSuccess: ({ responsibility }) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
        void queryClient.invalidateQueries({ queryKey: ['occurrences'] });
        toast(`${responsibility.title} added.`);
      },
    },
  });
}
