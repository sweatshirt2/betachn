import type { Endpoint } from '@/lib/api';

export const homeEndpoints = {
  rooms: { method: 'get', path: '/rooms' },
  createRoom: { method: 'post', path: '/rooms' },
  deleteRoom: { method: 'delete', path: '/rooms/:id' },
  assets: { method: 'get', path: '/assets' },
  createAsset: { method: 'post', path: '/assets' },
  assetDetail: { method: 'get', path: '/assets/:id' },
  logService: { method: 'post', path: '/assets/:id/service-records' },
} satisfies Record<string, Endpoint>;
