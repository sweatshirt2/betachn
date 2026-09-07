'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useApiMutation, useApiQuery, useDeviceMutation } from '@/lib/api';
import {
  deviceMarkNotificationRead,
  deviceReadAllNotifications,
  deviceSaveNotificationPrefs,
} from '@/lib/device/writes';
import { deviceNotifications, deviceNotificationPrefs } from '@/lib/device/reads';
import type { RootState } from '@/store';
import { notificationsEndpoints } from '../notifications.endpoints';
import type { NotificationPayload } from '../notifications.types';

export function useNotifications(unreadOnly = false) {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ notifications: NotificationPayload[] }>({
    endpoint: notificationsEndpoints.inbox,
    queryParams: unreadOnly ? { unread: 'true' } : {},
    key: ['notifications', unreadOnly ? 'unread' : 'all'] as const,
    options: {
      queryFn:
        mode === 'device'
          ? () => deviceNotifications(unreadOnly) as Promise<{ notifications: NotificationPayload[] }>
          : undefined,
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => void queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const server = useApiMutation<{ notification: NotificationPayload }, { id: string }>({
    endpoint: notificationsEndpoints.markRead,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ notification: NotificationPayload }, { id: string }>({
    write: ({ id }) => deviceMarkNotificationRead({ notificationId: id }).then(() => ({ notification: null as never })),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function useReadAll() {
  const queryClient = useQueryClient();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => void queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const server = useApiMutation<{ marked: number }, Record<string, never>>({
    endpoint: notificationsEndpoints.readAll,
    options: { onSuccess },
  });
  const device = useDeviceMutation<{ marked: number }, Record<string, never>>({
    write: () => deviceReadAllNotifications(),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}

export function useNotificationPrefs() {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useApiQuery<{ preferences: { categories: Record<string, boolean> } }>({
    endpoint: notificationsEndpoints.preferences,
    key: ['notification-prefs'] as const,
    options: {
      queryFn:
        mode === 'device'
          ? () => deviceNotificationPrefs() as Promise<{ preferences: { categories: Record<string, boolean> } }>
          : undefined,
    },
  });
}

export function useSavePrefs() {
  const queryClient = useQueryClient();
  const mode = useSelector((state: RootState) => state.auth.mode);

  const onSuccess = () => void queryClient.invalidateQueries({ queryKey: ['notification-prefs'] });

  const server = useApiMutation<unknown, { categories: Record<string, boolean> }>({
    endpoint: notificationsEndpoints.savePreferences,
    options: { onSuccess },
  });
  const device = useDeviceMutation<unknown, { categories: Record<string, boolean> }>({
    write: ({ categories }) => deviceSaveNotificationPrefs({ categories }),
    options: { onSuccess },
  });

  return mode === 'device' ? device : server;
}
