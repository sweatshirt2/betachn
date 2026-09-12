'use client';

import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

/**
 * Display-only permission gate (§3): reads the resolved permissionMap from
 * the auth slice. The server re-authorizes everything; this only decides
 * what UI to offer.
 */
export function usePermission(key: string): boolean {
  return useSelector((state: RootState) => state.auth.permissionMap[key] === true);
}
