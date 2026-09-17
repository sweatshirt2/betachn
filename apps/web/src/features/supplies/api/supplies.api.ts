'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { queryKeys, useApiMutation, useApiQuery, useDeviceMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import { deviceRecurringItems } from '@/lib/device/reads';
import {
  deviceArchiveRecurringItem,
  deviceCreateRecurringItem,
  deviceCreateSupply,
  deviceCycleSupply,
  deviceSnoozeRecurringItem,
  deviceUpdateRecurringItem,
} from '@/lib/device/writes';
import { deviceSupplies, deviceSupplyEvents } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { suppliesEndpoints } from '../supplies.endpoints';
import type {
  RecurringItemPayload,
  SupplyCycleStats,
  SupplyEventPayload,
  SupplyPayload,
  SupplyState,
} from '../supplies.types';

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

// —————————————————————————————————————————————————
// Recurring buy reminders (§4A.3 / D108–D110)
// —————————————————————————————————————————————————

export function useRecurringItems() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ items: RecurringItemPayload[] }>({
    endpoint: suppliesEndpoints.recurringItems,
    key: ['recurring-items'] as const,
    options: {
      queryFn:
        mode === 'device'
          ? () =>
              deviceRecurringItems() as Promise<{
                items: RecurringItemPayload[];
              }>
          : undefined,
    },
  });
}

function useInvalidateRecurring() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['recurring-items'] });
    void queryClient.invalidateQueries({ queryKey: ['activity'] });
  };
}

export function useCreateRecurringItem() {
  const invalidate = useInvalidateRecurring();
  const { toast } = useToast();
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => {
    invalidate();
    toast(t('ops.reminderCreatedToast'), { kind: 'success' });
  };

  const server = useApiMutation<
    { item: RecurringItemPayload },
    { name: string; intervalDays: number; supplyId?: string | null; lastBoughtOn?: string }
  >({ endpoint: suppliesEndpoints.createRecurringItem, options: { onSuccess } });
  const device = useDeviceMutation<
    { item: RecurringItemPayload },
    { name: string; intervalDays: number; supplyId?: string | null; lastBoughtOn?: string }
  >({
    write: (input, identity) =>
      deviceCreateRecurringItem({ ...identity, ...input }).then(() => ({
        item: {} as RecurringItemPayload,
      })),
    options: { onSuccess },
  });
  return mode === 'device' ? device : server;
}

export function useSnoozeRecurringItem() {
  const invalidate = useInvalidateRecurring();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => invalidate();

  const server = useApiMutation<{ item: RecurringItemPayload }, { id: string; days?: number }>({
    endpoint: suppliesEndpoints.snoozeRecurringItem,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ item: RecurringItemPayload }, { id: string; days?: number }>({
    write: ({ id, days }, identity) =>
      deviceSnoozeRecurringItem({ ...identity, itemId: id, days }).then(() => ({
        item: {} as RecurringItemPayload,
      })),
    options: { onSuccess },
  });
  return mode === 'device' ? device : server;
}

export function useUpdateRecurringItem() {
  const invalidate = useInvalidateRecurring();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => invalidate();

  const server = useApiMutation<
    { item: RecurringItemPayload },
    { id: string; patch: { name?: string; intervalDays?: number; state?: 'active' | 'paused' } }
  >({ endpoint: suppliesEndpoints.updateRecurringItem, options: { onSuccess } });
  const device = useDeviceMutation<
    { item: RecurringItemPayload },
    { id: string; patch: { name?: string; intervalDays?: number; state?: 'active' | 'paused' } }
  >({
    write: ({ id, patch }, identity) =>
      deviceUpdateRecurringItem({ ...identity, itemId: id, patch }).then(() => ({
        item: {} as RecurringItemPayload,
      })),
    options: { onSuccess },
  });
  return mode === 'device' ? device : server;
}

export function useArchiveRecurringItem() {
  const invalidate = useInvalidateRecurring();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => invalidate();

  const server = useApiMutation<{ ok: boolean }, { id: string }>({
    endpoint: suppliesEndpoints.archiveRecurringItem,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ ok: boolean }, { id: string }>({
    write: ({ id }, identity) =>
      deviceArchiveRecurringItem({ ...identity, itemId: id }).then(() => ({ ok: true })),
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
