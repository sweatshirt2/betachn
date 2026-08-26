import { z } from 'zod';
import { allPermKeys, type PermKey, type PermissionMap } from '../../permissions';

/** Complete permission matrix — every catalogued key must be present. */
const PERM_KEYS = allPermKeys();

export const permKeySchema = z.enum(PERM_KEYS as [PermKey, ...PermKey[]]);
export const permissionMapSchema: z.ZodType<PermissionMap> = z
  .record(permKeySchema, z.boolean())
  .refine(
    (map) => PERM_KEYS.every((key) => typeof map[key] === 'boolean'),
    'Permission map must cover every catalogued key',
  ) as z.ZodType<PermissionMap>;
export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).nullish(),
  isOwnerRole: z.boolean().optional(),
  /** Omitted ⇒ customRoleBaseline() participation preset (CN §15 frictionless). */
  permissions: permissionMapSchema.optional(),
});

/**
 * PATCH semantics: rename/description changes leave permissions untouched;
 * `permissions`, when provided, replaces the live matrix wholesale (§11 item 1).
 */
export const updateRoleSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isOwnerRole: z.boolean().optional(),
  permissions: permissionMapSchema.optional(),
});

export const roleIdParamsSchema = z.object({ id: z.string().uuid() });

export const roleRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  builtinKey: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  isOwnerRole: z.boolean(),
  isBuiltin: z.boolean(),
  permissions: permissionMapSchema,
  defaultPermissions: permissionMapSchema,
  createdAt: z.date(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type RoleRecord = z.infer<typeof roleRowSchema>;
