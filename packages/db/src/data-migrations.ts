import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './models';

type Db = NodePgDatabase<typeof schema>;

/**
 * Idempotent data backfills (schema lives ONLY in drizzle/ migrations — this
 * runner never touches DDL). Each fix is a no-op on already-correct data, so
 * running it after every `db:migrate` is safe and keeps any environment
 * (local, Neon, fresh deploy) converging without manual SQL.
 */
async function backfills(db: Db): Promise<void> {
  // D115 backfill — shopping items created before sort_key existed got NULL.
  // The list order contract is sortKey ASC, createdAt ASC; numbering seeded
  // rows by createdAt (with rowid tiebreak) reproduces that contract exactly,
  // so ordering is byte-for-byte identical after the backfill.
  await db.execute(sql`
    WITH ranked AS (
      SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at, id)) * 1000.0 AS k
      FROM shopping_items
      WHERE sort_key IS NULL
    )
    UPDATE shopping_items s
    SET sort_key = r.k
    FROM ranked r
    WHERE s.id = r.id
  `);
}

/** Runs after a successful migration; errors surface but never abort boot. */
export async function runDataBackfills(db: Db): Promise<void> {
  try {
    await backfills(db);
  } catch (err) {
    console.error('data backfill failed:', err);
    process.exitCode = 1;
  }
}
