'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ApiError, queryKeys, useApiMutation, useDeviceMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import { deviceOccurrenceAct, deviceCreateResponsibility } from '@/lib/device/writes';
import type { RootState } from '@/store';
import { choresEndpoints } from '../chores.endpoints';
import type { CreateResponsibilityBody, OccurrenceAction, TitledOccurrence } from '../chores.types';

type ActVariables = { id: string } & OccurrenceAction;

/**
 * Occurrence actions with conversational toasts + Undo (reopen ≤10 min by
 * the same actor, §6.6). ALREADY_DONE corrects state with a soft info toast.
 * Device households run the same rules against the device mirror (Phase A3,
 * D58/D67) — toasts and invalidations are shared.
 */
export function useOccurrenceAct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    void queryClient.invalidateQueries({ queryKey: ['occurrences'] });
  };

  const reopen = useApiMutation<{ occurrence: TitledOccurrence }, { id: string }>({
    endpoint: choresEndpoints.occurrenceAct,
    options: { onSettled: refresh },
  });
  const reopenDevice = useDeviceMutation<{ occurrence: TitledOccurrence }, { id: string }>({
    write: ({ id }, identity) =>
      deviceOccurrenceAct({ ...identity, occurrenceId: id, action: { action: 'reopen' } }).then(
        (occurrence) => ({ occurrence }),
      ),
    options: { onSettled: refresh },
  });

  const onSuccess = ({ occurrence }: { occurrence: TitledOccurrence }) => {
    refresh();
    if (occurrence.status === 'completed') {
      toast(t('activity.occurrenceCompleted', { title: occurrence.title }), {
        label: t('common.undo'),
        run: () => (mode === 'device' ? reopenDevice.mutate({ id: occurrence.id }) : reopen.mutate({ id: occurrence.id })),
      });
    } else {
      toast(t('chores.updatedToast', { title: occurrence.title }));
    }
  };
  const onError = (error: ApiError) => {
    if (error.code === 'ALREADY_DONE') {
      refresh();
      toast(t('chores.alreadyHandled'));
    }
  };

  const act = useApiMutation<{ occurrence: TitledOccurrence }, ActVariables>({
    endpoint: choresEndpoints.occurrenceAct,
    options: { onSuccess, onError },
  });
  const actDevice = useDeviceMutation<{ occurrence: TitledOccurrence }, ActVariables>({
    write: ({ id, ...action }, identity) =>
      deviceOccurrenceAct({ ...identity, occurrenceId: id, action }).then((occurrence) => ({ occurrence })),
    options: { onSuccess, onError },
  });

  return mode === 'device' ? actDevice : act;
}

export function useCreateResponsibility() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ responsibility }: { responsibility: { id: string; title: string } }) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    void queryClient.invalidateQueries({ queryKey: ['occurrences'] });
    toast(`${responsibility.title} added.`);
  };

  const server = useApiMutation<{ responsibility: { id: string; title: string } }, CreateResponsibilityBody>({
    endpoint: choresEndpoints.createResponsibility,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ responsibility: { id: string; title: string } }, CreateResponsibilityBody>({
    write: (body, identity) =>
      deviceCreateResponsibility({ ...identity, ...body }).then((r) => ({ responsibility: r })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}
