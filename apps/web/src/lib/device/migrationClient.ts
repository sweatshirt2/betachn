import type { MigrationClient } from '@chorify/local-db/apply-migrations';

/** Device database file inside OPFS. */
export const DEVICE_DB_PATH = '/chorify.sqlite3';

/** Narrow structural surface of the wasm oo1 database we rely on. */
export type WasmDb = {
  exec(statement: string): unknown;
  exec(query: {
    sql: string;
    bind?: unknown[];
    rowMode: 'array';
    returnValue: 'resultRows';
  }): unknown[][];
};

/**
 * Browser-side MigrationClient adapter over SQLite-WASM (D67 edge seam).
 * Mirrors the node adapter in local-db/client.ts; the same
 * `applyDeviceMigrations` track runs verbatim on both engines.
 */
export function sqliteWasmMigrationClient(db: WasmDb): MigrationClient {
  return {
    exec: (statement) => {
      db.exec(statement);
    },
    transaction: (fn) => {
      db.exec('BEGIN');
      try {
        fn();
        db.exec('COMMIT');
      } catch (error) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // Rollback failure means the connection is wedged; surface the
          // original error so bootstrap reports the true cause.
        }
        throw error;
      }
    },
    userVersion: () => {
      const rows = db.exec({
        sql: 'PRAGMA user_version',
        rowMode: 'array',
        returnValue: 'resultRows',
      });
      const first = rows[0] as unknown[] | undefined;
      const value = first?.[0];
      return typeof value === 'number' ? value : 0;
    },
  };
}/** Main-thread ↔ device-worker message protocol. */
export type DeviceRequest =
  | { id: number; kind: 'query'; sql: string; params: unknown[] }
  | { id: number; kind: 'ping' };

export type DeviceResponse =
  | { id: number; ok: true; rows: unknown[][] }
  | { id: number; ok: false; error: string }
  | { kind: 'ready'; appliedVersion: number; capability: DeviceCapability; error?: string };

/** Capability achieved by the worker's bootstrap ladder (§4.12). */
export type DeviceCapability = 'opfs' | 'memory' | 'none';
