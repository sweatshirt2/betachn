import type { DeviceDatabase } from './client';
import { DEVICE_MIGRATIONS } from './migrations.generated';

/** Minimal raw-SQLite surface needed to run the migration track anywhere. */
export interface MigrationClient {
  /** Executes one raw statement (DDL or PRAGMA). */
  exec(statement: string): void;
  transaction(fn: () => void): void;
  /** SQLite `PRAGMA user_version` — the applied-migration watermark. */
  userVersion(): number;
}

/**
 * Applies the device migration track in one transaction per statement batch,
 * recording progress in `user_version`. Idempotent no-op when current.
 */
export function applyDeviceMigrations(sqlite: MigrationClient): number {
  const applied = sqlite.userVersion();
  if (applied >= DEVICE_MIGRATIONS.length) return applied;

  let current = applied;
  sqlite.transaction(() => {
    for (const migration of DEVICE_MIGRATIONS.slice(applied)) {
      for (const statement of splitStatements(migration.sql)) {
        sqlite.exec(statement);
      }
      current++;
      sqlite.exec(`PRAGMA user_version = ${current}`);
    }
  });
  return current;
}

/** Splits on drizzle-kit's `--> statement-breakpoint` marker. */
function splitStatements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function isUpToDate(sqlite: MigrationClient): boolean {
  return sqlite.userVersion() >= DEVICE_MIGRATIONS.length;
}

export type { DeviceDatabase };
