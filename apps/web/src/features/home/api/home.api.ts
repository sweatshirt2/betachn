'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { queryKeys, useApiMutation, useApiQuery, useDeviceMutation } from '@/lib/api';
import { useToast } from '@/components/ui';
import { deviceCreateRoom, deviceCreateAsset, deviceLogService } from '@/lib/device/writes';
import { deviceRooms, deviceAssets } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { homeEndpoints } from '../home.endpoints';
import type { AssetDetail, AssetPayload, RoomPayload } from '../home.types';

export function useRooms() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ rooms: RoomPayload[] }>({
    endpoint: homeEndpoints.rooms,
    key: ['rooms'] as const,
    options: {
      queryFn: mode === 'device' ? () => deviceRooms().then((rooms) => ({ rooms })) : undefined,
    },
  });
}

export function useAssets() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ assets: AssetPayload[] }>({
    endpoint: homeEndpoints.assets,
    key: ['assets'] as const,
    options: {
      queryFn: mode === 'device' ? () => deviceAssets().then((assets) => ({ assets })) : undefined,
    },
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
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ room }: { room: RoomPayload }) => {
    void queryClient.invalidateQueries({ queryKey: ['rooms'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    toast(`${room.name} added.`);
  };

  const server = useApiMutation<{ room: RoomPayload }, { name: string }>({
    endpoint: homeEndpoints.createRoom,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ room: RoomPayload }, { name: string }>({
    write: ({ name }, identity) => deviceCreateRoom({ ...identity, name }).then((room) => ({ room })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = ({ asset }: { asset: AssetPayload }) => {
    void queryClient.invalidateQueries({ queryKey: ['assets'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    toast(`${asset.name} added.`);
  };

  const server = useApiMutation<{ asset: AssetPayload }, { name: string; roomId?: string | null }>({
    endpoint: homeEndpoints.createAsset,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ asset: AssetPayload }, { name: string; roomId?: string | null }>({
    write: ({ name, roomId }, identity) =>
      deviceCreateAsset({ ...identity, name, roomId }).then((asset) => ({ asset })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function useLogService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['assets'] });
    void queryClient.invalidateQueries({ queryKey: ['asset'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.today() });
    toast(t('ops.serviceLogged'));
  };

  const server = useApiMutation<unknown, { id: string; servicedOn: string }>({
    endpoint: homeEndpoints.logService,
    options: { onSuccess },
  });
  const device = useDeviceMutation<unknown, { id: string; servicedOn: string }>({
    write: ({ id, servicedOn }, identity) =>
      deviceLogService({ ...identity, assetId: id, servicedOn }),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}
