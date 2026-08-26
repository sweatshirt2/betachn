import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Database as SqliteNative } from 'better-sqlite3';
import * as schema from './schema';
import type { MigrationClient } from './apply-migrations';

/** Canonical device-database type — every opener satisfies this surface. */
export type DeviceDatabase = BetterSQLite3Database<typeof schema>;
export { schema };

export interface NodeDevice {
  db: DeviceDatabase;
  sqlite: SqliteNative;
  migrations: MigrationClient;
}

/**
 * Node/test opener over better-sqlite3 (devDependency). Production browsers
 * use the worker-side OPFS opener with an equivalent MigrationClient adapter;
 * this exists so the whole engine is smoke-testable against real SQLite
 * without a DOM.
 */
export async function openNodeDevice(file: string): Promise<NodeDevice> {
  const { default: Database } = await import('better-sqlite3');
  const sqlite: SqliteNative = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
    migrations: nodeMigrationClient(sqlite),
  };
}

function nodeMigrationClient(sqlite: SqliteNative): MigrationClient {
  return {
    exec: (statement) => {
      sqlite.exec(statement);
    },
    transaction: (fn) => {
      sqlite.transaction(fn)();
    },
    // better-sqlite3 types the simple-mode pragma as unknown in some versions
  userVersion: () => sqlite.pragma('user_version', { simple: true }) as number,
  };
}
