'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/lib/api';
import { useToast } from '@/components/ui';
import { shoppingEndpoints } from '../shopping.endpoints';
import type { ShoppingItemPayload } from '../shopping.types';

export function useShoppingItems() {
  return useApiQuery<{ items: ShoppingItemPayload[] }>({
    endpoint: shoppingEndpoints.items,
    key: ['shopping-items'] as const,
  });
}

export function useCreateShoppingItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useApiMutation<{ item: ShoppingItemPayload }, { name: string }>({
    endpoint: shoppingEndpoints.createItem,
    options: {
      onSuccess: ({ item }) => {
        void queryClient.invalidateQueries({ queryKey: ['shopping-items'] });
        toast(`${item.name} added to shopping.`);
      },
    },
  });
}

export function usePurchaseItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useApiMutation<{ item: ShoppingItemPayload }, { id: string }>({
    endpoint: shoppingEndpoints.purchaseItem,
    options: {
      onSuccess: ({ item }) => {
        void queryClient.invalidateQueries({ queryKey: ['shopping-items'] });
        void queryClient.invalidateQueries({ queryKey: ['supplies'] });
        toast(`Bought ${item.name} — supply refilled.`);
      },
    },
  });
}
