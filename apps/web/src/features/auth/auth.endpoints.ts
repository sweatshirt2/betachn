import type { Endpoint } from '@/lib/api';

/** URL registry for the auth feature — components never hardcode URLs. */
export const authEndpoints = {
  login: { method: 'post', path: '/auth/login' },
  householdPreview: { method: 'post', path: '/auth/household-preview' },
  registerOnline: { method: 'post', path: '/auth/register-online' },
  google: { method: 'post', path: '/auth/google' },
  linkGoogle: { method: 'post', path: '/auth/link-google' },
  logout: { method: 'post', path: '/auth/logout' },
  switchProfile: { method: 'post', path: '/profiles/switch' },
} satisfies Record<string, Endpoint>;
