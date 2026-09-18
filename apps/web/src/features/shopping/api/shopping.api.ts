'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { queryKeys, useApiMutation, useApiQuery, useDeviceMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import {
  deviceCreateShoppingItem,
  devicePurchaseItem,
  deviceReorderShoppingItem,
} from '@/lib/device/writes';
import { deviceShoppingItems } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { shoppingEndpoints } from '../shopping.endpoints';
import type { ReorderItemVariables, ShoppingItemPayload } from '../shopping.types';

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
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ item }: { item: ShoppingItemPayload }) => {
    void queryClient.invalidateQueries({ queryKey: ['shopping-items'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    toast(t('ops.shoppingItemAdded', { name: item.name }), { kind: 'success' });
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
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ item }: { item: ShoppingItemPayload }) => {
    void queryClient.invalidateQueries({ queryKey: ['shopping-items'] });
    void queryClient.invalidateQueries({ queryKey: ['supplies'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    toast(t('ops.shoppingBought', { name: item.name }), { kind: 'success' });
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

/**
 * Drag-to-reorder (D115): optimistic position via sparse sortKey. The
 * dragged item's new spot is expressed by its neighbors — the server/device
 * twin computes the midpoint key; one row is written either way.
 */
export function useReorderShoppingItem() {
  const queryClient = useQueryClient();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSettled = () => {
    void queryClient.invalidateQueries({ queryKey: ['shopping-items'] });
  };

  const server = useApiMutation<{ item: ShoppingItemPayload }, ReorderItemVariables>({
    endpoint: shoppingEndpoints.reorderItem,
    options: { onSettled },
  });
  const device = useDeviceMutation<{ item: ShoppingItemPayload }, ReorderItemVariables>({
    write: ({ itemId, beforeItemId, afterItemId }, identity) =>
      deviceReorderShoppingItem({ ...identity, itemId, beforeItemId, afterItemId }).then(
        (r) => ({ item: { ...r, name: '', quantityText: null, purchasedAt: null } as ShoppingItemPayload }),
      ),
    options: { onSettled },
  });

  return mode === 'device' ? device : server;
}
