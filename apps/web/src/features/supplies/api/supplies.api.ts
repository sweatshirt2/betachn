'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { queryKeys, useApiMutation, useApiQuery, useDeviceMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import { deviceCreateSupply, deviceCycleSupply } from '@/lib/device/writes';
import { deviceSupplies, deviceSupplyEvents } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { suppliesEndpoints } from '../supplies.endpoints';
import type { SupplyCycleStats, SupplyEventPayload, SupplyPayload, SupplyState } from '../supplies.types';

export function useSupplies() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ supplies: SupplyPayload[] }>({
    endpoint: suppliesEndpoints.supplies,
    key: ['supplies'] as const,
    options: {
      queryFn:
        mode === 'device'
          ? () => deviceSupplies() as Promise<{ supplies: SupplyPayload[] }>
          : undefined,
    },
  });
}

export function useCreateSupply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ supply }: { supply: SupplyPayload }) => {
    void queryClient.invalidateQueries({ queryKey: ['supplies'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    toast(t('ops.supplyAdded', { name: supply.name }), { kind: 'success' });
  };

  const server = useApiMutation<{ supply: SupplyPayload }, { name: string }>({
    endpoint: suppliesEndpoints.createSupply,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ supply: SupplyPayload }, { name: string }>({
    write: ({ name }, identity) =>
      deviceCreateSupply({ ...identity, name }).then((supply) => ({ supply })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

/** §4A.1 / D102: event log + cycle facts for one supply (facts strip). */
export function useSupplyEvents(supplyId: string | null) {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ events: SupplyEventPayload[]; stats: SupplyCycleStats }>({
    endpoint: suppliesEndpoints.supplyEvents,
    pathParams: { id: supplyId ?? '' },
    key: ['supplies', 'events', supplyId ?? ''] as const,
    options: {
      enabled: supplyId !== null,
      queryFn:
        mode === 'device' && supplyId !== null
          ? () => deviceSupplyEvents(supplyId) as Promise<{ events: SupplyEventPayload[]; stats: SupplyCycleStats }>
          : undefined,
    },
  });
}

export function useCycleSupply() {
  const queryClient = useQueryClient();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['supplies'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
  };

  const server = useApiMutation<{ supply: SupplyPayload }, { id: string; state: SupplyState }>({
    endpoint: suppliesEndpoints.updateSupply,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ supply: SupplyPayload }, { id: string; state: SupplyState }>({
    write: ({ id, state }, identity) =>
      deviceCycleSupply({ ...identity, supplyId: id, state }).then((supply) => ({ supply })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}
