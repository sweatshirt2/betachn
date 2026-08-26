import { and, eq, isNotNull } from 'drizzle-orm';
import { AppError } from '../../errors';
import { activityEvents, people, roles } from '@chorify/db';
import { buildActivity, type ActivityDraft } from '../../activity';
import { customRoleBaseline } from '../../permissions';
import type { Executor, UnitOfWork } from '../../db';
import type {
  CreateRoleInput,
  RoleRecord,
  UpdateRoleInput,
} from './roles.schema';
import { permissionMapSchema, roleRowSchema } from './roles.schema';
import { lastOwnerBlockers, resetMatrixFor } from './roles.rules';

interface OwnerSnapshot {
  roleId: string | null;
  role: { isOwnerRole: boolean } | null;
}

/**
 * Roles = permission presets (CN §19). Services are authorization-free —
 * routes gate with requirePermission first; business invariants (LAST_OWNER,
 * builtin protection) live here so every caller shares them.
 */
export class RolesService {
  constructor(private readonly uow: UnitOfWork) {}

  async list(householdId: string): Promise<RoleRecord[]> {
    const rows = await this.uow.exec.query.roles!.findMany({
      where: eq(roles.householdId, householdId),
      orderBy: [roles.name],
    });
    return rows.map((row) => roleRowSchema.parse(row));
  }

  async create(
    actorPersonId: string | null,
    householdId: string,
    input: CreateRoleInput,
  ): Promise<RoleRecord> {
    const permissions = input.permissions ?? customRoleBaseline();
    const parsed = permissionMapSchema.parse(permissions);
    return this.uow.transact(async (tx) => {
      const [row] = await tx.insert(roles).values({
        householdId,
        name: input.name,
        description: input.description ?? null,
        isOwnerRole: input.isOwnerRole ?? false,
        isBuiltin: false,
        permissions: parsed,
        // Create-time snapshot: custom "Reset to default" restores THIS (CN §17).
        defaultPermissions: parsed,
      }).returning();
      await tx.insert(activityEvents).values({
        householdId, actorPersonId, ...buildActivity('role.added', { roleName: input.name }),
      });
      return roleRowSchema.parse(row);
    });
  }

  async update(
    actorPersonId: string | null,
    householdId: string,
    roleId: string,
    input: UpdateRoleInput,
  ): Promise<RoleRecord> {
    return this.uow.transact(async (tx) => {
      const row = await this.getRow(tx, householdId, roleId);
      if (input.isOwnerRole === false && row.isOwnerRole) {
        const blockers = lastOwnerBlockers(await this.otherOwnerCount(tx, householdId, roleId));
        if (blockers.length > 0) throw new AppError('LAST_OWNER', 'The household needs at least one owner');
      }
      const [updated] = await tx.update(roles).set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isOwnerRole !== undefined ? { isOwnerRole: input.isOwnerRole } : {}),
        ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
      }).where(eq(roles.id, roleId)).returning();
      await tx.insert(activityEvents).values({
        householdId, actorPersonId, ...buildActivity('role.updated', { roleName: updated?.name ?? row.name }),
      });
      return roleRowSchema.parse(updated);
    });
  }

  async reset(actorPersonId: string | null, householdId: string, roleId: string): Promise<RoleRecord> {
    return this.uow.transact(async (tx) => {
      const row = await this.getRow(tx, householdId, roleId);
      const [updated] = await tx.update(roles)
        .set({ permissions: resetMatrixFor(row) })
        .where(eq(roles.id, roleId))
        .returning();
      await tx.insert(activityEvents).values({
        householdId, actorPersonId, ...buildActivity('role.reset', { roleName: row.name }),
      });
      return roleRowSchema.parse(updated);
    });
  }

  /** Custom roles only; assigned roles reject with IN_USE (§6.10 spirit). */
  async remove(actorPersonId: string | null, householdId: string, roleId: string): Promise<void> {
    await this.uow.transact(async (tx) => {
      const row = await this.getRow(tx, householdId, roleId);
      if (row.isBuiltin) {
        throw new AppError('CONFLICT', 'Built-in roles cannot be deleted');
      }
      const members = await tx.query.people!.findMany({
        where: eq(people.roleId, roleId),
        columns: { id: true },
      });
      if (members.length > 0) {
        throw new AppError('IN_USE', 'Reassign members before deleting this role');
      }
      await tx.delete(roles).where(eq(roles.id, roleId));
      await tx.insert(activityEvents).values({
        householdId, actorPersonId, ...buildActivity('role.removed', { roleName: row.name }),
      });
    });
  }

  /** Cross-household ids read as 404 — never confirm existence (§8). */
  private async getRow(exec: Executor, householdId: string, roleId: string) {
    const row = await exec.query.roles!.findFirst({
      where: and(eq(roles.id, roleId), eq(roles.householdId, householdId)),
    });
    if (!row) throw new AppError('NOT_FOUND', 'Role not found');
    return roleRowSchema.parse(row);
  }

  /** Owners who would REMAIN after `roleId` stops being an owner-role. */
  private async otherOwnerCount(exec: Executor, householdId: string, roleId: string): Promise<number> {
    const snapshots = await exec.query.people!.findMany({
      where: and(eq(people.householdId, householdId), isNotNull(people.roleId)),
      columns: { id: true, roleId: true },
      with: { role: { columns: { isOwnerRole: true } } },
    }) as unknown as OwnerSnapshot[];
    return snapshots.filter((p) => p.role?.isOwnerRole === true && p.roleId !== roleId).length;
  }
}


