import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import {
  activityEvents,
  assignmentRules,
  households,
  notifications,
  notificationPrefs,
  occurrenceProofs,
  occurrences,
  responsibilities,
} from '@chorify/db';
import type { OccurrenceSubtaskState } from '@chorify/db';
import { buildActivity, type ActivityType } from '../../activity';
import { addDays, expandRule, isoTodayInTz, type ExpandableRule } from '../../schedule';
import { AppError } from '../../errors';
import type { Clock } from '../../ports';
import type { Executor, UnitOfWork } from '../../db';
import { KIND_CATEGORY, filterByPrefs, resolveRecipients, type NotifyKind } from '../../notify';
import { ownerHolderPersonIds } from '../people';
import { applyCompletion, applyReopen, applySkip, requirePending } from './occurrences.rules';
import {
  occurrenceProofRowSchema,
  occurrenceRowSchema,
  titledOccurrenceSchema,
  type OccurrenceAction,
  type OccurrenceRecord,
  type OccurrenceStatus,
  type TitledOccurrenceRecord,
} from './occurrences.schema';

/** Generator horizon (§6.16): [today, today+13]. */
export function generationWindow(todayIso: string): { start: string; end: string } {
  return { start: todayIso, end: addDays(todayIso, 13) };
}

/** Rule fields materialization needs — satisfied by assignment_rules rows. */
export type MaterializableRule = Pick<
  ExpandableRule,
  'pattern' | 'interval' | 'daysOfWeek' | 'anchorDate' | 'monthDay' | 'dates' | 'startDate' | 'endDate' | 'rotation' | 'personIds'
> & { id: string; responsibilityId: string };

function expandable(rule: MaterializableRule): ExpandableRule {
  return {
    pattern: rule.pattern,
    interval: rule.interval,
    daysOfWeek: rule.daysOfWeek,
    anchorDate: rule.anchorDate,
    monthDay: rule.monthDay,
    dates: rule.dates,
    startDate: rule.startDate,
    endDate: rule.endDate,
    rotation: rule.rotation,
    personIds: rule.personIds,
  };
}

interface EmitOptions {
  kind: NotifyKind;
  /** i18n key persisted as notifications.type (§6.13) — never prose. */
  typeKey: string;
  paramsJson: Record<string, unknown>;
  linkPath?: string;
}

/**
 * Occurrence lifecycle services (§4.9 / §6). Pure transition logic lives in
 * occurrences.rules — this class adds persistence, idempotent materialization,
 * forward-only regeneration, activity events and notification fan-out.
 */
export class OccurrencesService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async listRange(
    householdId: string,
    opts: { from?: string; to?: string; status?: OccurrenceStatus; personId?: string } = {},
  ): Promise<OccurrenceRecord[]> {
    const conditions = [eq(occurrences.householdId, householdId)];
    if (opts.from) conditions.push(gte(occurrences.dueDate, opts.from));
    if (opts.to) conditions.push(lt(occurrences.dueDate, addDays(opts.to, 1)));
    const rows = await this.uow.exec.query.occurrences!.findMany({
      where: and(...conditions),
      orderBy: [occurrences.dueDate],
    });
    let records = rows.map((row) => occurrenceRowSchema.parse(row));
    // Dialect-neutral JS filtering for jsonb/array predicates (household-scale).
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    if (opts.personId) records = records.filter((r) => r.personIds.includes(opts.personId!));
    return records;
  }

  /**
   * listRange with the responsibility-title join the list wire contract
   * (§4.14) promises — the Chores list renders titles from this. Raw
   * listRange above stays for internal/aggregate use.
   */
  async listRangeTitled(
    householdId: string,
    opts: { from?: string; to?: string; status?: OccurrenceStatus; personId?: string } = {},
  ): Promise<TitledOccurrenceRecord[]> {
    const conditions = [eq(occurrences.householdId, householdId)];
    if (opts.from) conditions.push(gte(occurrences.dueDate, opts.from));
    if (opts.to) conditions.push(lt(occurrences.dueDate, addDays(opts.to, 1)));
    const rows = await this.uow.exec.query.occurrences!.findMany({
      where: and(...conditions),
      orderBy: [occurrences.dueDate],
      with: { responsibility: { columns: { title: true, icon: true } } },
    });
    let records = rows.map((row) => {
      const { responsibility, ...rest } = row as typeof row & {
        responsibility: { title: string; icon: string | null } | undefined;
      };
      return titledOccurrenceSchema.parse({
        ...rest,
        title: responsibility?.title ?? '',
        icon: responsibility?.icon ?? null,
      });
    });
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    if (opts.personId) records = records.filter((r) => r.personIds.includes(opts.personId!));
    return records;
  }

  /**
   * Expands rules into the horizon window with `(ruleId,dueDate)` conflict
   * skips — reruns are no-ops for existing rows; completed history untouched
   * (§4.8/§6.16).
   */
  async materializeRules(
    tx: Executor,
    householdId: string,
    rules: MaterializableRule[],
  ): Promise<number> {
    return expandRulesIntoWindow(
      tx,
      householdId,
      rules,
      isoTodayInTz(await householdTimezone(tx, householdId), this.clock.now()),
    );
  }

  /** Whole-household sweep — worker cron entry point. */
  async materializeHousehold(householdId: string): Promise<number> {
    const rules = await this.loadActiveRules(this.uow.exec, householdId);
    return this.uow.transact((tx) => this.materializeRules(tx, householdId, rules));
  }

  /**
   * Rule edits regenerate FORWARD ONLY (§6.1): pending ∧ dueDate ≥ today are
   * deleted then re-expanded inside the caller's transaction; terminal rows
   * stay immutable.
   */
  async regenerateForward(responsibilityId: string): Promise<void> {
    return this.uow.transact(async (tx) =>
      regenerateForwardTx(
        tx,
        responsibilityId,
        isoTodayInTz(
          await householdTimezone(tx, await responsibilityHouseholdId(tx, responsibilityId)),
          this.clock.now(),
        ),
      ),
    );
  }

  async act(
    actorPersonId: string,
    householdId: string,
    occurrenceId: string,
    action: OccurrenceAction,
  ): Promise<OccurrenceRecord> {
    return this.uow.transact(async (tx) => {
      const found = await this.findRow(tx, householdId, occurrenceId);
      const row = occurrenceRowSchema.parse(found);
      const now = this.clock.now();
      const title = await this.responsibilityTitle(tx, row.responsibilityId);

      let patch: Record<string, unknown>;
      switch (action.action) {
        case 'complete':
          patch = applyCompletion(toTransition(row), actorPersonId, now, action.note);
          break;
        case 'skip':
          patch = applySkip(toTransition(row), action.skipReason);
          break;
        case 'reopen':
          patch = applyReopen(toTransition(row), actorPersonId, now);
          break;
        case 'reassign':
          requirePending(row.status);
          patch = { personIds: action.personIds };
          break;
      }

      const updated = await tx.update(occurrences).set(patch)
        .where(eq(occurrences.id, row.id)).returning();
      const record = occurrenceRowSchema.parse(updated[0]);

      switch (action.action) {
        case 'complete':
          await emitActivity(tx, householdId, actorPersonId, 'occurrence.completed', { title });
          await this.emitNotifications(tx, householdId, {
            kind: 'completion',
            typeKey: 'notify.completion.recorded',
            paramsJson: { title },
            linkPath: '/chores',
          }, row.ruleId, actorPersonId);
          break;
        case 'skip':
          await emitActivity(tx, householdId, actorPersonId, 'occurrence.skipped', { title });
          break;
        case 'reopen':
          await emitActivity(tx, householdId, actorPersonId, 'occurrence.reopened', { title });
          break;
        case 'reassign':
          await emitActivity(tx, householdId, actorPersonId, 'occurrence.reassigned', {
            title, personIds: action.personIds,
          });
          await this.emitNotifications(tx, householdId, {
            kind: 'assignment',
            typeKey: 'notify.assignment.received',
            paramsJson: { title },
            linkPath: '/chores',
          }, row.ruleId, actorPersonId, action.personIds);
          break;
      }
      return record;
    });
  }

  /** Hourly sweeper (§4.9): pending ∧ dueDate < today(household tz) → missed. */
  /**
   * Proof photos (§4A.2 / D104–D107). Bind = upload + completer permission;
   * the blob was already stored by POST /uploads — this persists the binding
   * row. Binding is allowed while the occurrence is pending OR terminal for
   * the COMPLETER (after-completion edits ride D107: the completer may edit
   * photos any time; status immutability is untouched — photos are not
   * status). Non-completers can bind only while pending with complete
   * permission (pre-completion attach).
   */
  async bindProof(
    householdId: string,
    occurrenceId: string,
    actorPersonId: string,
    canComplete: boolean,
    key: string,
    clientUuid?: string,
  ): Promise<unknown> {
    return this.uow.transact(async (tx) => {
      const row = await this.findRow(tx, householdId, occurrenceId);
      const isCompleter = row.completedByPersonId === actorPersonId;
      if (row.status !== 'pending' && !isCompleter) {
        throw new AppError('FORBIDDEN', 'Only the member who completed this can edit its photos');
      }
      if (!canComplete) {
        throw new AppError('FORBIDDEN', 'You do not have permission for this', {
          missingPermission: 'responsibilities.complete',
        });
      }
      // Idempotent replay (D71, house pattern): resolve by clientUuid first.
      if (clientUuid !== undefined && clientUuid !== '') {
        const existing = await tx.query.occurrenceProofs!.findFirst({
          where: eq(occurrenceProofs.clientUuid, clientUuid),
        });
        if (existing) return occurrenceProofRowSchema.parse(existing);
      }
      const [proof] = await tx
        .insert(occurrenceProofs)
        .values({
          occurrenceId: row.id,
          key,
          uploadedByPersonId: actorPersonId,
          ...(clientUuid !== undefined && clientUuid !== '' ? { clientUuid } : {}),
        })
        .returning();
      return occurrenceProofRowSchema.parse(proof);
    });
  }

  /** List proofs for an occurrence (view = occurrence visibility, §4A.2). */
  async listProofs(householdId: string, occurrenceId: string): Promise<unknown[]> {
    const rows = await this.uow.exec.query.occurrenceProofs!.findMany({
      where: and(eq(occurrenceProofs.occurrenceId, occurrenceId)),
      orderBy: occurrenceProofs.createdAt,
    });
    // Scope check: the occurrence must belong to the caller's household.
    await this.findRow(this.uow.exec, householdId, occurrenceId);
    return rows.map((r) => occurrenceProofRowSchema.parse(r));
  }

  async removeProof(
    householdId: string,
    occurrenceId: string,
    actorPersonId: string,
    proofId: string,
  ): Promise<{ ok: true }> {
    return this.uow.transact(async (tx) => {
      const row = await this.findRow(tx, householdId, occurrenceId);
      const proof = await tx.query.occurrenceProofs!.findFirst({
        where: eq(occurrenceProofs.id, proofId),
      });
      if (!proof || proof.occurrenceId !== row.id) {
        throw new AppError('NOT_FOUND', 'Proof not found');
      }
      const isCompleter = row.completedByPersonId === actorPersonId;
      if (!isCompleter && row.status !== 'pending') {
        throw new AppError('FORBIDDEN', 'Only the member who completed this can edit its photos');
      }
      await tx.delete(occurrenceProofs).where(eq(occurrenceProofs.id, proofId));
      // Blob removal is the storage edge's job — the service returns the key.
      return { ok: true as const, key: proof.key };
    });
  }

  async sweepMissed(householdId: string): Promise<number> {
    return this.uow.transact(async (tx) => {
      const today = isoTodayInTz(await householdTimezone(tx, householdId), this.clock.now());
      const staleRows = await tx.query.occurrences!.findMany({
        where: and(
          eq(occurrences.householdId, householdId),
          eq(occurrences.status, 'pending'),
          lt(occurrences.dueDate, today),
        ),
      });
      let count = 0;
      for (const staleRow of staleRows) {
        const row = occurrenceRowSchema.parse(staleRow);
        await tx.update(occurrences).set({ status: 'missed' }).where(eq(occurrences.id, row.id));
        const title = await this.responsibilityTitle(tx, row.responsibilityId);
        await emitActivity(tx, householdId, null, 'occurrence.missed', { title });
        await this.emitNotifications(tx, householdId, {
          kind: 'missed',
          typeKey: 'notify.missed.detected',
          paramsJson: { title },
          linkPath: '/chores',
        }, row.ruleId, null);
        count++;
      }
      return count;
    });
  }

  private async findRow(exec: Executor, householdId: string, occurrenceId: string) {
    const row = await exec.query.occurrences!.findFirst({
      where: and(eq(occurrences.id, occurrenceId), eq(occurrences.householdId, householdId)),
    });
    if (!row) throw new AppError('NOT_FOUND', 'Occurrence not found');
    return row;
  }

  private async responsibilityTitle(exec: Executor, responsibilityId: string): Promise<string> {
    const row = await exec.query.responsibilities!.findFirst({
      where: eq(responsibilities.id, responsibilityId),
      columns: { title: true },
    });
    return row ? String(row.title ?? '') : '';
  }

  private async emitNotifications(
    exec: Executor,
    householdId: string,
    opts: EmitOptions,
    ruleId: string,
    actorPersonId: string | null,
    overrideAssignees?: string[],
  ): Promise<void> {
    const rule = await exec.query.assignmentRules!.findFirst({
      where: eq(assignmentRules.id, ruleId),
      columns: { createdByPersonId: true },
    });
    const creatorId = rule?.createdByPersonId ? String(rule.createdByPersonId) : null;
    const owners = await ownerHolderPersonIds(exec, householdId);

    const recipients = resolveRecipients(opts.kind, {
      assigneePersonIds: overrideAssignees ?? [],
      ruleCreatorPersonId: creatorId,
      ownerPersonIds: owners,
      actorPersonId,
    });
    if (recipients.length === 0) return;

    const prefRows = await exec.query.notificationPrefs!.findMany({
      where: inArray(notificationPrefs.personId, recipients),
    }) as unknown as Array<{ personId: string; categories: Record<string, boolean> }>;
    const prefsByPerson = new Map(prefRows.map((r) => [r.personId, r.categories]));
    const finalRecipients = filterByPrefs(recipients, opts.kind, (id) => prefsByPerson.get(id));
    if (finalRecipients.length === 0) return;

    await exec.insert(notifications).values(
      finalRecipients.map((personId) => ({
        householdId,
        recipientPersonId: personId,
        category: KIND_CATEGORY[opts.kind],
        type: opts.typeKey,
        paramsJson: opts.paramsJson,
        linkPath: opts.linkPath ?? null,
      })),
    );
  }

  private async loadActiveRules(exec: Executor, householdId: string): Promise<MaterializableRule[]> {
    const rows = await exec.query.assignmentRules!.findMany({
      columns: {
        id: true, responsibilityId: true, pattern: true, interval: true,
        daysOfWeek: true, anchorDate: true, monthDay: true, dates: true,
        startDate: true, endDate: true, rotation: true, personIds: true, active: true,
      },
      with: { responsibility: { columns: { householdId: true, archivedAt: true } } },
    }) as unknown as Array<
      MaterializableRule & {
        active: boolean;
        responsibility: { householdId: string; archivedAt: Date | null } | null;
      }
    >;
    return rows
      .filter(
        (r) =>
          r.active &&
          r.responsibility !== null &&
          r.responsibility.householdId === householdId &&
          r.responsibility.archivedAt === null,
      )
      .map(({ responsibility: _r, active: _a, ...rule }) => rule);
  }
}

async function emitActivity(
  exec: Executor,
  householdId: string,
  actorPersonId: string | null,
  type: ActivityType,
  payload: Record<string, unknown>,
): Promise<void> {
  await exec.insert(activityEvents).values({
    householdId, actorPersonId, ...buildActivity(type, payload),
  });
}

function toTransition(row: OccurrenceRecord) {
  return {
    status: row.status,
    subtaskStates: row.subtaskStates as Record<string, OccurrenceSubtaskState>,
    completedByPersonId: row.completedByPersonId,
    completedAt: row.completedAt,
    note: row.note,
    skipReason: row.skipReason,
  };
}

/**
 * Shared expansion primitive: upserts rule hits into the horizon window.
 * One implementation, several callers — worker generator, responsibilities
 * create/update flows (§4.8).
 */
export async function expandRulesIntoWindow(
  tx: Executor,
  householdId: string,
  rules: MaterializableRule[],
  todayIso: string,
): Promise<number> {
  const window = generationWindow(todayIso);
  const values = rules.flatMap((rule) =>
    expandRule(expandable(rule), window.start, window.end).map((hit) => ({
      householdId,
      responsibilityId: rule.responsibilityId,
      ruleId: rule.id,
      dueDate: hit.date,
      personIds: hit.personIds,
      subtaskStates: {} as Record<string, OccurrenceSubtaskState>,
    })),
  );
  if (values.length === 0) return 0;
  const inserted = await tx.insert(occurrences).values(values).onConflictDoNothing().returning();
  return inserted.length;
}

/**
 * §6.8: day boundaries compute in households.timezone. One tiny lookup per
 * household-scoped call — household scale, always indexed by PK.
 */
async function householdTimezone(exec: Executor, householdId: string): Promise<string> {
  const row = await exec.query.households!.findFirst({
    where: eq(households.id, householdId),
    columns: { timezone: true },
  });
  return String(row?.timezone ?? 'Africa/Addis_Ababa');
}

async function responsibilityHouseholdId(exec: Executor, responsibilityId: string): Promise<string> {
  const row = await exec.query.responsibilities!.findFirst({
    where: eq(responsibilities.id, responsibilityId),
    columns: { householdId: true },
  });
  if (!row) throw new AppError('NOT_FOUND', 'Responsibility not found');
  return String(row.householdId);
}

/**
 * Forward-only regeneration (§6.1): pending ∧ dueDate ≥ today deleted and
 * re-expanded; terminal rows untouched. Caller's transaction scope.
 */
export async function regenerateForwardTx(
  tx: Executor,
  responsibilityId: string,
  todayIso: string,
): Promise<void> {
  const ownerRow = await tx.query.responsibilities!.findFirst({
    where: eq(responsibilities.id, responsibilityId),
    columns: { householdId: true },
  });
  if (!ownerRow) throw new AppError('NOT_FOUND', 'Responsibility not found');
  const rules = (await tx.query.assignmentRules!.findMany({
    where: eq(assignmentRules.responsibilityId, responsibilityId),
    columns: {
      id: true, responsibilityId: true, pattern: true, interval: true,
      daysOfWeek: true, anchorDate: true, monthDay: true, dates: true,
      startDate: true, endDate: true, rotation: true, personIds: true,
    },
  })) as unknown as MaterializableRule[];
  if (rules.length === 0) return;

  await tx.delete(occurrences).where(
    and(
      inArray(occurrences.ruleId, rules.map((r) => r.id)),
      gte(occurrences.dueDate, todayIso),
      eq(occurrences.status, 'pending'),
    )!,
  );
  await expandRulesIntoWindow(tx, String(ownerRow.householdId), rules, todayIso);
}
