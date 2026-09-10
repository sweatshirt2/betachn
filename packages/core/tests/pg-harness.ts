import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { households, people, responsibilities, assignmentRules, roles } from '@chorify/db';
import { pgUnitOfWork, type UnitOfWork } from '@chorify/db';
import type { Clock } from '../src/ports';
import * as schema from '@chorify/db';

/**
 * PG-backed service test harness (§16.3 "fake-based unit tests mask real
 * driver bugs"). Creates a THROWAWAY database (name suffixed with the worker
 * pid — vitest runs files in parallel processes, and a shared name raced on
 * DROP/CREATE, skipping the losers), applies the real drizzle migrations
 * from packages/db/drizzle, and hands out a real pgUnitOfWork — the same
 * edge services get in production.
 *
 * Suites using it skip cleanly when Postgres is unreachable, so
 * `pnpm test` stays green on machines without a server (CI note: provide
 * DATABASE_URL + a superuser-capable postgres to enable). Crashed runs can
 * leave `chorify_test_<pid>` databases behind — prune occasionally with
 * `DROP DATABASE ... WITH (FORCE)`.
 */

const TEST_DB = `chorify_test_${process.pid}`;
const ADMIN_URL = process.env.PG_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres';

export interface PgHarness {
  pool: Pool;
  db: NodePgDatabase<typeof schema>;
  uow: UnitOfWork;
  clock: Clock;
  seedHousehold: () => Promise<SeedFixture>;
}

export interface SeedFixture {
  householdId: string;
  ownerId: string;
  responsibilityId: string;
  ruleId: string;
}

export const clock: Clock = { now: () => new Date('2026-09-07T09:00:00Z') };

async function createHarness(): Promise<PgHarness> {
  const admin = new Pool({ connectionString: ADMIN_URL });
  // Throwaway database: drop even with active connections from a crashed run.
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  const testDbUrl = new URL(ADMIN_URL);
  testDbUrl.pathname = `/${TEST_DB}`;
  const pool = new Pool({ connectionString: testDbUrl.toString() });
  const db = drizzle(pool, { schema });
  // Real migration track — never a hand-rolled CREATE TABLE.
  // (import.meta.dirname is unreliable under tsx/vitest — resolve from the file URL.)
  const migrationsFolder = join(fileURLToPath(new URL('.', import.meta.url)), '../../db/drizzle');
  await migrate(db, { migrationsFolder });

  const uow = pgUnitOfWork(db);

  let seedCounter = 0;
  async function seedHousehold(): Promise<SeedFixture> {
    // households.code is unique — vary the last letter per seed within a run.
    const code = `PGTES${String.fromCharCode(65 + (seedCounter++ % 26))}`;
    return uow.transact(async (tx) => {
      const [household] = await tx
        .insert(households)
        .values({ name: 'Harness Family', code })
        .returning();
      const [ownerRole] = await tx
        .insert(roles)
        .values({
          householdId: household.id,
          name: 'Guardian',
          isBuiltin: true,
          isOwnerRole: true,
          permissions: {},
          defaultPermissions: {},
        })
        .returning();
      const [owner] = await tx
        .insert(people)
        .values({ householdId: household.id, roleId: ownerRole.id, name: 'Hana' })
        .returning();
      const [responsibility] = await tx
        .insert(responsibilities)
        .values({
          householdId: household.id,
          title: 'Trash',
          createdByPersonId: owner.id,
        })
        .returning();
      const [rule] = await tx
        .insert(assignmentRules)
        .values({
          responsibilityId: responsibility.id,
          pattern: 'daily',
          startDate: '2026-09-07',
          personIds: [owner.id],
          createdByPersonId: owner.id,
        })
        .returning();
      return {
        householdId: String(household.id),
        ownerId: String(owner.id),
        responsibilityId: String(responsibility.id),
        ruleId: String(rule.id),
      };
    });
  }

  return { pool, db, uow, clock, seedHousehold };
}

/**
 * Singleton promise: migrations run once per test run. On failure the
 * exported value is null so suites skip instead of failing the run.
 */
export const pgHarness: Promise<PgHarness | null> = createHarness().catch((err) => {
  console.warn(`[pg-harness] Postgres unavailable — pg-backed suites will SKIP (${String(err)})`);
  return null;
});

void pgHarness;
