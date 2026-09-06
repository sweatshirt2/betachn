'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/lib/api';
import { useToast } from '@/components/ui';
import { suppliesEndpoints } from '../supplies.endpoints';
import type { SupplyPayload, SupplyState } from '../supplies.types';

export function useSupplies() {
  return useApiQuery<{ supplies: SupplyPayload[] }>({
    endpoint: suppliesEndpoints.supplies,
    key: ['supplies'] as const,
  });
}

export function useCreateSupply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useApiMutation<{ supply: SupplyPayload }, { name: string }>({
    endpoint: suppliesEndpoints.createSupply,
    options: {
      onSuccess: ({ supply }) => {
        void queryClient.invalidateQueries({ queryKey: ['supplies'] });
        toast(`${supply.name} added.`);
      },
    },
  });
}

export function useCycleSupply() {
  const queryClient = useQueryClient();
  return useApiMutation<{ supply: SupplyPayload }, { id: string; state: SupplyState }>({
    endpoint: suppliesEndpoints.updateSupply,
    options: { onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['supplies'] }) },
  });
}
