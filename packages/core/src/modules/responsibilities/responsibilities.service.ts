import { and, eq, isNull } from 'drizzle-orm';
import {
  activityEvents,
  assignmentRules,
  households,
  responsibilities,
  subtasks,
} from '@chorify/db';
import { buildActivity, type ActivityType } from '../../activity';
import { AppError } from '../../errors';
import type { Clock } from '../../ports';
import type { Executor, UnitOfWork } from '../../db';
import { isoTodayInTz, type SchedulePattern } from '../../schedule';
import {
  expandRulesIntoWindow,
  regenerateForwardTx,
  type MaterializableRule,
} from '../occurrences';
import type {
  CreateResponsibilityInput,
  ResponsibilityDetail,
  ResponsibilityRecord,
  RuleInput,
  UpdateResponsibilityInput,
} from './responsibilities.schema';
import { responsibilityRowSchema, ruleRowSchema, schedulePatternSchema, subtaskRowSchema } from './responsibilities.schema';
import { normalizeRuleDates } from './responsibilities.rules';
import { z } from 'zod';

const ruleScheduleRow = z.object({
  id: z.string().uuid(),
  assignmentRules: z.array(
    z.object({
      id: z.string().uuid(),
      pattern: schedulePatternSchema,
      interval: z.number().int().nullable(),
    }),
  ),
});

function ruleToMaterializable(rule: RuleInput & { id: string; responsibilityId: string }): MaterializableRule {
  return {
    responsibilityId: rule.responsibilityId,
    id: rule.id,
    pattern: rule.pattern,
    interval: rule.interval ?? null,
    daysOfWeek: rule.daysOfWeek ?? null,
    anchorDate: normalizeRuleDates(rule).anchorDate,
    monthDay: rule.monthDay ?? null,
    dates: rule.dates ?? null,
    startDate: rule.startDate,
    endDate: rule.endDate ?? null,
    rotation: rule.rotation ?? null,
    personIds: rule.personIds,
  };
}

function ruleValues(responsibilityId: string, rule: RuleInput, createdByPersonId: string | null) {
  return {
    responsibilityId,
    pattern: rule.pattern,
    interval: rule.interval ?? null,
    daysOfWeek: rule.daysOfWeek ?? null,
    ...normalizeRuleDates(rule),
    monthDay: rule.monthDay ?? null,
    dates: rule.dates ?? null,
    startDate: rule.startDate,
    endDate: rule.endDate ?? null,
    rotation: rule.rotation ?? null,
    personIds: rule.personIds,
    createdByPersonId,
  };
}

/**
 * Responsibilities own their nested subtasks and assignment rules (CN §33–39).
 * Create/update materializes occurrences immediately so Today reflects new
 * chores without waiting for the worker's quarter-hour sweep.
 */
export class ResponsibilitiesService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async list(householdId: string, opts: { includeArchived?: boolean } = {}) {
    const scope = opts.includeArchived
      ? eq(responsibilities.householdId, householdId)
      : and(eq(responsibilities.householdId, householdId), isNull(responsibilities.archivedAt))!;
    const rows = await this.uow.exec.query.responsibilities!.findMany({
      where: scope,
      with: { subtasks: true, assignmentRules: true },
      orderBy: [responsibilities.createdAt],
    });
    return rows.map((row) => responsibilityRowSchema.parse(row));
  }

  async create(
    actorPersonId: string | null,
    householdId: string,
    input: CreateResponsibilityInput,
  ): Promise<ResponsibilityRecord> {
    return this.uow.transact(async (tx) => {
      const [row] = await tx.insert(responsibilities).values({
        householdId,
        title: input.title,
        notes: input.notes ?? null,
        routineId: input.routineId ?? null,
        roomId: input.roomId ?? null,
        icon: input.icon ?? '📌',
        proofMode: input.proofMode,
        createdByPersonId: actorPersonId,
      }).returning();
      const created = responsibilityRowSchema.parse(row);

      if (input.subtasks.length > 0) {
        await tx.insert(subtasks).values(input.subtasks.map((st, idx) => ({
          responsibilityId: created.id,
          title: st.title,
          sortOrder: st.sortOrder ?? idx,
          assigneePersonId: st.assigneePersonId ?? null,
        })));
      }

      const insertedRules = (await tx.insert(assignmentRules).values(
        input.rules.map((rule) => ruleValues(created.id, rule, actorPersonId)),
      ).returning()) as unknown as Array<RuleInput & { id: string; responsibilityId: string }>;

      // Instant materialization — no wait for the quarter-hour worker sweep.
      await expandRulesIntoWindow(
        tx,
        householdId,
        insertedRules.map(ruleToMaterializable),
        isoTodayInTz(await householdTimezone(tx, householdId), this.clock.now()),
      );

      await tx.insert(activityEvents).values({
        householdId,
        actorPersonId,
        ...buildActivity('responsibility.created', { title: input.title }),
      });
      return created;
    });
  }

  async update(
    actorPersonId: string | null,
    householdId: string,
    responsibilityId: string,
    input: UpdateResponsibilityInput,
  ): Promise<ResponsibilityRecord> {
    return this.uow.transact(async (tx) => {
      const existing = await this.getRow(tx, householdId, responsibilityId);

      const [updated] = await tx.update(responsibilities).set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.routineId !== undefined ? { routineId: input.routineId } : {}),
        ...(input.roomId !== undefined ? { roomId: input.roomId } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.proofMode !== undefined ? { proofMode: input.proofMode } : {}),
        ...(input.archived !== undefined
          ? { archivedAt: input.archived ? this.clock.now() : null }
          : {}),
      }).where(eq(responsibilities.id, responsibilityId)).returning();

      let rulesChanged = false;
      if (input.rules) {
        await tx.delete(assignmentRules).where(eq(assignmentRules.responsibilityId, responsibilityId));
        if (input.rules.length > 0) {
          await tx.insert(assignmentRules).values(
            input.rules.map((rule) => ruleValues(responsibilityId, rule, existing.createdByPersonId)),
          );
        }
        rulesChanged = true;
      }
      if (input.subtasks) {
        await tx.delete(subtasks).where(eq(subtasks.responsibilityId, responsibilityId));
        if (input.subtasks.length > 0) {
          await tx.insert(subtasks).values(input.subtasks.map((st, idx) => ({
            responsibilityId,
            title: st.title,
            sortOrder: st.sortOrder ?? idx,
            assigneePersonId: st.assigneePersonId ?? null,
          })));
        }
      }

      // Forward-only regeneration whenever the schedule changed (§6.1).
      if (rulesChanged || input.archived !== undefined) {
        await regenerateForwardTx(
          tx,
          responsibilityId,
          isoTodayInTz(await householdTimezone(tx, householdId), this.clock.now()),
        );
      }

      const eventType: ActivityType =
        input.archived === true ? 'responsibility.archived' : 'responsibility.updated';
      await tx.insert(activityEvents).values({
        householdId,
        actorPersonId,
        ...buildActivity(eventType, { title: updated?.title ?? existing.title }),
      });
      return responsibilityRowSchema.parse(updated);
    });
  }

  private async getRow(exec: Executor, householdId: string, responsibilityId: string): Promise<ResponsibilityRecord> {
    const row = await exec.query.responsibilities!.findFirst({
      where: and(eq(responsibilities.id, responsibilityId), eq(responsibilities.householdId, householdId)),
    });
    if (!row) throw new AppError('NOT_FOUND', 'Responsibility not found');
    return responsibilityRowSchema.parse(row);
  }

  /**
   * Full detail for the chore screen: responsibility + subtasks + rules.
   * List stays light (header rows only); this is the nested read.
   */
  async detail(householdId: string, responsibilityId: string): Promise<ResponsibilityDetail> {
    const exec = this.uow.exec;
    const responsibility = await this.getRow(exec, householdId, responsibilityId);
    const [subtaskRows, ruleRows] = await Promise.all([
      exec.query.subtasks!.findMany({
        where: eq(subtasks.responsibilityId, responsibilityId),
      }),
      exec.query.assignmentRules!.findMany({
        where: eq(assignmentRules.responsibilityId, responsibilityId),
      }),
    ]);
    return {
      responsibility,
      subtasks: subtaskRows.map((row) => subtaskRowSchema.parse(row)),
      rules: ruleRows.map((row) => ruleRowSchema.parse(row)),
    };
  }

  /**
   * ruleId → schedule shape for grace-window evaluation (§4.9). Read-only;
   * consumed by the /today aggregate — no occurrence writes involved.
   */
  async ruleScheduleMap(
    householdId: string,
  ): Promise<Record<string, { pattern: SchedulePattern; interval: number | null }>> {
    const rows = await this.uow.exec.query.responsibilities!.findMany({
      where: eq(responsibilities.householdId, householdId),
      columns: { id: true },
      with: { assignmentRules: { columns: { id: true, pattern: true, interval: true } } },
    });
    const map: Record<string, { pattern: SchedulePattern; interval: number | null }> = {};
    for (const row of rows) {
      const parsed = ruleScheduleRow.parse(row);
      for (const rule of parsed.assignmentRules) {
        map[rule.id] = { pattern: rule.pattern, interval: rule.interval };
      }
    }
    return map;
  }
}

/** §6.8: day boundaries compute in households.timezone. */
async function householdTimezone(exec: Executor, householdId: string): Promise<string> {
  const row = await exec.query.households!.findFirst({
    where: eq(households.id, householdId),
    columns: { timezone: true },
  });
  return String(row?.timezone ?? 'Africa/Addis_Ababa');
}
