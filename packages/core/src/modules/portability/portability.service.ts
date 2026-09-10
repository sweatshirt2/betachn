import { eq, inArray } from 'drizzle-orm';
import { households, people, roles, users } from '@chorify/db';
import type { Row } from '../../db';
import { AppError } from '../../errors';
import type { Clock } from '../../ports';
import type { Executor, UnitOfWork } from '../../db';
import { dbExport, pgTableFor } from '../../db-pg-tables';
import { parseHouseholdExport, serializeHouseholdExport } from '../../txt';
import { HouseholdsService } from '../households';
import { ownerHolderPersonIds } from '../people';

/**
 * Tables resolve LAZILY via db-pg-tables (the core↔db module-evaluation
 * cycle poisons init-time table literals — see the registry docblock).
 * RQB keys below are strings, immune to the cycle.
 */

/** Household-scoped content sections exported verbatim. */
const SCOPED_SECTIONS: Exclude<SectionName, 'households' | 'notification_prefs'>[] = [
  'people',
  'users',
  'roles',
  'routines',
  'responsibilities',
  'subtasks',
  'assignment_rules',
  'occurrences',
  'rooms',
  'assets',
  'service_records',
  'supplies',
  'shopping_items',
  'activity_events',
  'notifications',
];

/** Adoption inserts run parents-first to satisfy FKs. */
const ADOPTION_ORDER: SectionName[] = [
  'roles',
  'people',
  'users',
  'routines',
  'rooms',
  'responsibilities',
  'subtasks',
  'assignment_rules',
  'occurrences',
  'assets',
  'service_records',
  'supplies',
  'shopping_items',
  'activity_events',
  'notifications',
  'notification_prefs',
];

type SectionName = (typeof EXPORT_SECTION_NAMES)[number];

const EXPORT_SECTION_NAMES = [
  'households',
  'people',
  'users',
  'roles',
  'routines',
  'responsibilities',
  'subtasks',
  'assignment_rules',
  'occurrences',
  'rooms',
  'assets',
  'service_records',
  'supplies',
  'shopping_items',
  'activity_events',
  'notifications',
  'notification_prefs',
] as const;

/**
 * TXT section name → drizzle relational-query key. The RQB is keyed by the
 * camelCase schema export names, NOT the snake_case table/section names —
 * querying by section name silently resolves to undefined and throws at
 * runtime (caught by the step-10 live smoke, invisible to fake-based tests).
 */
const SECTION_RELATIONS: Record<SectionName, string> = {
  households: 'households',
  people: 'people',
  users: 'users',
  roles: 'roles',
  routines: 'routines',
  responsibilities: 'responsibilities',
  subtasks: 'subtasks',
  assignment_rules: 'assignmentRules',
  occurrences: 'occurrences',
  rooms: 'rooms',
  assets: 'assets',
  service_records: 'serviceRecords',
  supplies: 'supplies',
  shopping_items: 'shoppingItems',
  activity_events: 'activityEvents',
  notifications: 'notifications',
  notification_prefs: 'notificationPrefs',
};

/**
 * JSON roundtrips (the txt format itself) turn pg timestamps into ISO
 * strings, but pg timestamp columns need Date objects — without this every
 * fresh adoption 500s on the first createdAt (same coercion the sync
 * applier performs for device payloads).
 */
function coerceTimestamps(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'string' && k.endsWith('At') ? new Date(v) : v;
  }
  return out;
}

/**
 * §4.11 portability. Export = TXT snapshot minus identity material (stripped
 * by the txt kernel: password hashes, phones) plus lastExportAt stamp.
 * Import adopts ONLY fresh targets: rows beyond the registering trio block
 * with IMPORT_CONFLICT before any write (CN §67 — never merge, never guess).
 */
export class PortabilityService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly householdsService: HouseholdsService,
  ) {}

  async exportHousehold(householdId: string): Promise<{ text: string; filename: string }> {
    const exec = this.uow.exec;
    const householdRow = await this.householdsService.get(householdId);

    const sections: Partial<Record<SectionName, Row[]>> = {
      households: [householdRow as unknown as Row],
    };
    const prefsRows = await exec.query[SECTION_RELATIONS.notification_prefs]!.findMany({});
    sections.notification_prefs = prefsRows as unknown as Row[];

    for (const section of SCOPED_SECTIONS) {
      if (section === 'subtasks' || section === 'assignment_rules' || section === 'service_records') {
        // Nested rows scope through their parents (responsibilities/assets).
        sections[section] = await this.exportNested(exec, section, householdId);
        continue;
      }
      const table = pgTableFor(section);
      const rows = await exec.query[SECTION_RELATIONS[section]]!.findMany({
        where: eq(table.householdId, householdId),
      }) as unknown as Row[];
      sections[section] = rows;
    }

    const text = serializeHouseholdExport(sections);
    const today = this.clock.now();
    await this.householdsService.markExported(householdId, today);
    return { text, filename: `My-Household-${today.toISOString().slice(0, 10)}.txt` };
  }

  /**
   * Subtasks/assignment rules carry no householdId — they export through
   * their parent responsibilities; service records export through assets.
   */
  private async exportNested(
    exec: Executor,
    section: 'subtasks' | 'assignment_rules' | 'service_records',
    householdId: string,
  ): Promise<Row[]> {
    if (section === 'service_records') {
      const parentAssets = (await exec.query[SECTION_RELATIONS.assets]!.findMany({
        where: eq(dbExport('assets').householdId, householdId),
        columns: { id: true },
      })) as unknown as Array<{ id: string }>;
      const assetIds = parentAssets.map((a) => a.id);
      if (assetIds.length === 0) return [];
      return (await exec.query[SECTION_RELATIONS[section]]!.findMany({
        where: inArray(dbExport('serviceRecords').assetId, assetIds),
      })) as unknown as Row[];
    }
    const parents = (await exec.query[SECTION_RELATIONS.responsibilities]!.findMany({
      where: eq(dbExport('responsibilities').householdId, householdId),
      columns: { id: true },
    })) as unknown as Array<{ id: string }>;
    const ids = parents.map((p) => p.id);
    if (ids.length === 0) return [];
    const table = section === 'subtasks' ? dbExport('subtasks') : dbExport('assignmentRules');
    return (await exec.query[SECTION_RELATIONS[section]]!.findMany({
      where: inArray(table.responsibilityId, ids),
    })) as unknown as Row[];
  }

  /**
   * D62 adoption: ctx = registering trio (own user + own household +
   * placeholder person). Imported rows keep their ORIGINAL ids so every
   * cross-reference survives; the importer repoints onto an imported
   * owner-role holder and the placeholder person is deleted (§4.11).
   */
  async importForAdoption(
    rawText: string,
    ctx: { userId: string; householdId: string },
  ): Promise<{ importedOwnerPersonId: string }> {
    const { data } = parseHouseholdExport(rawText);

    return this.uow.transact(async (tx) => {
      // Claim scaffold teardown (D72): the registering claim seeded ONE
      // sentinel owner-role for the placeholder session. Detach people from
      // it, delete it, THEN run the fresh-target scan — the target must look
      // exactly as if nothing but the registering trio ever existed.
      await tx.update(people).set({ roleId: null }).where(eq(people.householdId, ctx.householdId));
      await tx.delete(roles).where(eq(roles.householdId, ctx.householdId));

      const counts = await this.freshTargetConflicts(tx, ctx);
      if (counts) throw new AppError('IMPORT_CONFLICT', 'This account already holds household data', counts);

      // Adopt household profile fields verbatim (code identical by claim).
      const importedHousehold = data.households[0];
      if (importedHousehold) {
        await tx.update(households).set({
          ...(importedHousehold.name !== undefined ? { name: String(importedHousehold.name) } : {}),
          ...(importedHousehold.currency !== undefined ? { currency: String(importedHousehold.currency) } : {}),
          ...(importedHousehold.timezone !== undefined ? { timezone: String(importedHousehold.timezone) } : {}),
        }).where(eq(households.id, ctx.householdId));
      }

      for (const section of ADOPTION_ORDER) {
        const rows = data[section];
        if (!rows || rows.length === 0) continue;
        if (section === 'users') continue; // identity stays ours; only seat mapping below
        const table = pgTableFor(section) as object;
        await tx.insert(table).values(rows.map(coerceTimestamps) as Row[]);
      }

      const owners = await ownerHolderPersonIds(tx, ctx.householdId);
      if (owners.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Import file contains no owner-role holder');
      }
      const importedOwner = owners[0]!;

      const ownUser = await tx.query.users!.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { personId: true },
      });
      const placeholderPersonId = ownUser?.personId ? String(ownUser.personId) : null;
      await tx.update(users).set({ personId: importedOwner }).where(eq(users.id, ctx.userId));
      if (placeholderPersonId && placeholderPersonId !== importedOwner) {
        await tx.delete(people).where(eq(people.id, placeholderPersonId));
      }

      await tx.update(households)
        .set({ syncedAt: this.clock.now() })
        .where(eq(households.id, ctx.householdId));
      return { importedOwnerPersonId: importedOwner };
    });
  }

  /**
   * CN §69: ANY rows beyond own user/person/household ⇒ blocked, zero writes.
   * Returns conflict counts for the UI message; null when target is fresh.
   */
  private async freshTargetConflicts(
    exec: Executor,
    ctx: { userId: string; householdId: string },
  ): Promise<Record<string, number> | null> {
    const counts: Record<string, number> = {};
    let ownPersonId: string | null = null;
    const ownUsers = await exec.query.users!.findMany({
      where: eq(users.id, ctx.userId),
      columns: { personId: true },
    }) as unknown as Array<{ personId: string | null }>;
    ownPersonId = ownUsers[0]?.personId ?? null;

    const peopleCount = (
      await exec.query.people!.findMany({
        where: eq(people.householdId, ctx.householdId),
        columns: { id: true },
      })
    ).length;
    counts.people = Math.max(0, peopleCount - (ownPersonId ? 1 : 0));

    for (const section of ['roles', 'routines', 'responsibilities', 'occurrences', 'rooms', 'assets', 'supplies', 'shopping_items'] as const) {
      const table = pgTableFor(section) as { householdId: never };
      const rows = await exec.query[SECTION_RELATIONS[section]]!.findMany({
        where: eq(table.householdId, ctx.householdId),
        columns: { id: true },
      });
      counts[section] = rows.length;
    }

    const blocked = Object.entries(counts).filter(([, n]) => n > 0);
    return blocked.length > 0 ? Object.fromEntries(blocked) : null;
  }
}
