'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/lib/api';
import { useToast } from '@/components/ui';
import { homeEndpoints } from '../home.endpoints';
import type { AssetDetail, AssetPayload, RoomPayload } from '../home.types';

export function useRooms() {
  return useApiQuery<{ rooms: RoomPayload[] }>({
    endpoint: homeEndpoints.rooms,
    key: ['rooms'] as const,
  });
}

export function useAssets() {
  return useApiQuery<{ assets: AssetPayload[] }>({
    endpoint: homeEndpoints.assets,
    key: ['assets'] as const,
  });
}

export function useAsset(id: string) {
  return useApiQuery<AssetDetail>({
    endpoint: homeEndpoints.assetDetail,
    pathParams: { id },
    key: ['asset', id] as const,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useApiMutation<{ room: RoomPayload }, { name: string }>({
    endpoint: homeEndpoints.createRoom,
    options: {
      onSuccess: ({ room }) => {
        void queryClient.invalidateQueries({ queryKey: ['rooms'] });
        toast(`${room.name} added.`);
      },
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useApiMutation<{ asset: AssetPayload }, { name: string; roomId?: string | null }>({
    endpoint: homeEndpoints.createAsset,
    options: {
      onSuccess: ({ asset }) => {
        void queryClient.invalidateQueries({ queryKey: ['assets'] });
        toast(`${asset.name} added.`);
      },
    },
  });
}

export function useLogService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useApiMutation<unknown, { id: string; servicedOn: string }>({
    endpoint: homeEndpoints.logService,
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['assets'] });
        void queryClient.invalidateQueries({ queryKey: ['asset'] });
        toast('Service logged.');
      },
    },
  });
}
