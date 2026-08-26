import { z } from 'zod';

export const notificationCategorySchema = z.enum([
  'assignment',
  'reminder',
  'completion',
  'missed',
  'finance',
  'bill',
  'backup',
]);

/** Mirrors the notifications table — parsed at the service boundary, not cast. */
export const notificationRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  recipientPersonId: z.string().uuid(),
  category: notificationCategorySchema,
  type: z.string(),
  paramsJson: z.record(z.string(), z.unknown()),
  linkPath: z.string().nullable(),
  readAt: z.date().nullable(),
  createdAt: z.date(),
});

export const notificationPrefsRowSchema = z.object({
  personId: z.string().uuid(),
  categories: z.record(z.string(), z.boolean()),
});

/** PATCH-style toggles — only the categories being changed. */
export const putNotificationPrefsSchema = z.object({
  categories: z.record(z.string(), z.boolean()),
});

export const activityDomainSchema = z.enum([
  'household',
  'responsibilities',
  'finances',
  'home',
  'resources',
]);

/**
 * Story-feed event row. `type` + payload params are i18n KEYS plus snapshots,
 * never prose (§4.10); `domain` is the permission visibility gate.
 */
export const activityEventRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  actorPersonId: z.string().uuid().nullable(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  domain: activityDomainSchema,
  createdAt: z.date(),
});

/**
 * Wire query contract for GET activity. NOTE: member/chore/from/to are
 * declared here but applied in JS by the service after a range fetch —
 * dialect-neutral convention that avoids jsonb filtering in SQL.
 */
export const activityQuerySchema = z.object({
  member: z.string().uuid().optional(),
  action: z.string().max(60).optional(),
  chore: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().nullish(),
});

export type NotificationCategory = z.infer<typeof notificationCategorySchema>;
export type NotificationRecord = z.infer<typeof notificationRowSchema>;
export type NotificationPrefsRecord = z.infer<typeof notificationPrefsRowSchema>;
export type PutNotificationPrefsInput = z.infer<typeof putNotificationPrefsSchema>;
// ActivityDomain intentionally NOT re-declared here — import it from the activity kernel (../../activity) to keep one canonical union.
export type ActivityEventRecord = z.infer<typeof activityEventRowSchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
