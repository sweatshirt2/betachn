import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { households } from './households.model';

/**
 * Permission presets. `permissions` is the live matrix; `defaultPermissions`
 * is the reset snapshot (factory matrix for builtins, create-time copy for
 * custom roles). isOwnerRole marks the owner-permission role — ownership is
 * separate from displayed identity (CN §20–22).
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    builtinKey: text('builtin_key'),
    name: text('name').notNull(),
    description: text('description'),
    isOwnerRole: boolean('is_owner_role').notNull().default(false),
    isBuiltin: boolean('is_builtin').notNull(),
    permissions: jsonb('permissions')
      .$type<Record<string, boolean>>()
      .notNull(),
    defaultPermissions: jsonb('default_permissions')
      .$type<Record<string, boolean>>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('roles_household_id_idx').on(t.householdId)],
);

export type Role = typeof roles.$inferSelect;
