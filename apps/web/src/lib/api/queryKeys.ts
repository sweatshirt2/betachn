/** Shared query-key factory — every feature composes from these roots. */
export const queryKeys = {
  me: () => ['me'] as const,
  profiles: () => ['profiles'] as const,
  today: () => ['today'] as const,
  occurrences: (filters: Record<string, string>) => ['occurrences', filters] as const,
  activity: (filters: Record<string, string>) => ['activity', filters] as const,
  notifications: () => ['notifications'] as const,
};
