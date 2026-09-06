'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/lib/api';
import { notificationsEndpoints } from '../notifications.endpoints';
import type { NotificationPayload } from '../notifications.types';

export function useNotifications(unreadOnly = false) {
  return useApiQuery<{ notifications: NotificationPayload[] }>({
    endpoint: notificationsEndpoints.inbox,
    queryParams: unreadOnly ? { unread: 'true' } : {},
    key: ['notifications', unreadOnly ? 'unread' : 'all'] as const,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useApiMutation<{ notification: NotificationPayload }, { id: string }>({
    endpoint: notificationsEndpoints.markRead,
    options: {
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    },
  });
}

export function useReadAll() {
  const queryClient = useQueryClient();
  return useApiMutation<{ marked: number }, Record<string, never>>({
    endpoint: notificationsEndpoints.readAll,
    options: {
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    },
  });
}

export function useNotificationPrefs() {
  return useApiQuery<{ preferences: { categories: Record<string, boolean> } }>({
    endpoint: notificationsEndpoints.preferences,
    key: ['notification-prefs'] as const,
  });
}

export function useSavePrefs() {
  const queryClient = useQueryClient();
  return useApiMutation<unknown, { categories: Record<string, boolean> }>({
    endpoint: notificationsEndpoints.savePreferences,
    options: {
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notification-prefs'] }),
    },
  });
}
