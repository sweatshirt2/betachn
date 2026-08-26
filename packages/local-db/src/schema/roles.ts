import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { households } from './households';

/** Permission presets; defaultPermissions is the reset snapshot (CN §17). */
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  builtinKey: text('builtin_key'),
  name: text('name').notNull(),
  description: text('description'),
  isOwnerRole: integer('is_owner_role', { mode: 'boolean' }).notNull().default(false),
  isBuiltin: integer('is_builtin', { mode: 'boolean' }).notNull(),
  permissions: text('permissions', { mode: 'json' }).$type<Record<string, boolean>>().notNull(),
  defaultPermissions: text('default_permissions', { mode: 'json' })
    .$type<Record<string, boolean>>()
    .notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type RoleRow = typeof roles.$inferSelect;
