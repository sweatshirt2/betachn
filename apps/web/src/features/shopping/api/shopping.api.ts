'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { queryKeys, useApiMutation, useApiQuery, useDeviceMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import { deviceCreateShoppingItem, devicePurchaseItem } from '@/lib/device/writes';
import { deviceShoppingItems } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { shoppingEndpoints } from '../shopping.endpoints';
import type { ShoppingItemPayload } from '../shopping.types';

export function useShoppingItems() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ items: ShoppingItemPayload[] }>({
    endpoint: shoppingEndpoints.items,
    key: ['shopping-items'] as const,
    options: {
      queryFn:
        mode === 'device'
          ? () => deviceShoppingItems() as Promise<{ items: ShoppingItemPayload[] }>
          : undefined,
    },
  });
}

export function useCreateShoppingItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ item }: { item: ShoppingItemPayload }) => {
    void queryClient.invalidateQueries({ queryKey: ['shopping-items'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    toast(`${item.name} added to shopping.`);
  };

  const server = useApiMutation<{ item: ShoppingItemPayload }, { name: string }>({
    endpoint: shoppingEndpoints.createItem,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ item: ShoppingItemPayload }, { name: string }>({
    write: ({ name }, identity) =>
      deviceCreateShoppingItem({ ...identity, name }).then((item) => ({ item })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function usePurchaseItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ item }: { item: ShoppingItemPayload }) => {
    void queryClient.invalidateQueries({ queryKey: ['shopping-items'] });
    void queryClient.invalidateQueries({ queryKey: ['supplies'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    toast(`Bought ${item.name} — supply refilled.`);
  };

  const server = useApiMutation<{ item: ShoppingItemPayload }, { id: string }>({
    endpoint: shoppingEndpoints.purchaseItem,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ item: ShoppingItemPayload }, { id: string }>({
    write: ({ id }, identity) =>
      devicePurchaseItem({ ...identity, itemId: id }).then((item) => ({ item })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}
