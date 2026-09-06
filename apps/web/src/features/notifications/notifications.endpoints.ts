import type { Endpoint } from '@/lib/api';

export const notificationsEndpoints = {
  inbox: { method: 'get', path: '/notifications' },
  markRead: { method: 'patch', path: '/notifications/:id/read' },
  readAll: { method: 'post', path: '/notifications/read-all' },
  preferences: { method: 'get', path: '/notifications/preferences' },
  savePreferences: { method: 'put', path: '/notifications/preferences' },
} satisfies Record<string, Endpoint>;
