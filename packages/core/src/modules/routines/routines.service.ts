import { eq } from 'drizzle-orm';
import { activityEvents, responsibilities, routines } from '@chorify/db';
import { buildActivity } from '../../activity';
import { AppError } from '../../errors';
import type { UnitOfWork } from '../../db';
import type {
  CreateRoutineInput,
  RoutineRecord,
  UpdateRoutineInput,
} from './routines.schema';
import { routineRowSchema } from './routines.schema';

/**
 * Routines organize responsibilities into buckets (CN §45) — they carry NO
 * scheduling power (§6 semantics); occurrence generation ignores them.
 */
export class RoutinesService {
  constructor(private readonly uow: UnitOfWork) {}

  async list(householdId: string): Promise<RoutineRecord[]> {
    const rows = await this.uow.exec.query.routines!.findMany({
      where: eq(routines.householdId, householdId),
    });
    return rows.map((row) => routineRowSchema.parse(row));
  }

  async create(
    actorPersonId: string | null,
    householdId: string,
    input: CreateRoutineInput,
  ): Promise<RoutineRecord> {
    const [row] = await this.uow.exec.insert(routines).values({
      householdId,
      name: input.name,
      icon: input.icon ?? '🌅',
      timeBucket: input.timeBucket ?? 'anytime',
    }).returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId, actorPersonId, ...buildActivity('routine.created', { name: input.name }),
    });
    return routineRowSchema.parse(row);
  }

  async update(
    actorPersonId: string | null,
    householdId: string,
    routineId: string,
    input: UpdateRoutineInput,
  ): Promise<RoutineRecord> {
    const existing = await this.getRow(householdId, routineId);
    const [updated] = await this.uow.exec.update(routines).set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.timeBucket !== undefined ? { timeBucket: input.timeBucket } : {}),
    }).where(eq(routines.id, routineId)).returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId,
      actorPersonId,
      ...buildActivity('routine.updated', { name: updated?.name ?? existing.name }),
    });
    return routineRowSchema.parse(updated);
  }

  /** Referenced routines reject deletion — move responsibilities first (§6.10). */
  async remove(actorPersonId: string | null, householdId: string, routineId: string): Promise<void> {
    const existing = await this.getRow(householdId, routineId);
    await this.uow.transact(async (tx) => {
      const used = await tx.query.responsibilities!.findFirst({
        where: eq(responsibilities.routineId, routineId),
        columns: { id: true },
      });
      if (used) throw new AppError('IN_USE', 'Move its responsibilities to another routine first');
      await tx.delete(routines).where(eq(routines.id, routineId));
      await tx.insert(activityEvents).values({
        householdId, actorPersonId, ...buildActivity('routine.removed', { name: existing.name }),
      });
    });
  }

  private async getRow(householdId: string, routineId: string): Promise<RoutineRecord> {
    const row = await this.uow.exec.query.routines!.findFirst({
      where: eq(routines.id, routineId),
    });
    if (!row || row.householdId !== householdId) throw new AppError('NOT_FOUND', 'Routine not found');
    return routineRowSchema.parse(row);
  }
}
