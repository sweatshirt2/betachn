/**
 * Device-database worker (§4.12 capability ladder): SQLite-WASM over OPFS
 * lives HERE, never on the main thread (sync access handles are worker-only).
 *
 * Bootstrap ladder, in order:
 *  1. init wasm → installOpfsSAHPoolVfs → open OpfsDb → migrations. Success
 *     reports `ready, capability:'opfs'` — the durable tier.
 *  2. OPFS unavailable (install throws): fall back to an in-memory sqlite
 *     (`:memory:` tier from §4.12) so the session still works; reports
 *     `ready, capability:'memory'`. Nothing survives a page reload — callers
 *     must treat memory data as session-scoped (the gate store refuses to
 *     persist a passcode there, and sync never trusts it as durable).
 *  3. Even wasm init fails: `ready, capability:'none'` with an error message;
 *     the main thread maps this to db-less mode.
 */
import { applyDeviceMigrations } from '@chorify/local-db/apply-migrations';
import { DEVICE_DB_PATH, sqliteWasmMigrationClient, type DeviceRequest, type DeviceResponse, type WasmDb } from './migrationClient';

type SqliteInit = (options?: {
  print?: (message: string) => void;
  printErr?: (message: string) => void;
  locateFile?: (path: string) => string;
}) => Promise<{
  oo1: {
    DB: new (path: string, flags: string, vfs?: string) => WasmDb;
  };
  installOpfsSAHPoolVfs: (options?: unknown) => Promise<unknown>;
}>;

let db: WasmDb | null = null;

function reply(response: DeviceResponse): void {
  self.postMessage(response);
}

async function bootstrap(): Promise<void> {
  const { default: initModule } = (await import('@sqlite.org/sqlite-wasm')) as unknown as {
    default: SqliteInit;
  };
  const sqlite3 = await initModule({
    print: () => {},
    printErr: () => {},
    locateFile: (path) => `/sqlite3-wasm/${path}`,
  });

  // Tier 1: durable OPFS storage (sync access handles are legal in workers).
  // installOpfsSAHPoolVfs registers the 'opfs-sahpool' VFS; open through it
  // explicitly (oo1.OpfsDb belongs to the async-proxy VFS, not this build).
  try {
    await sqlite3.installOpfsSAHPoolVfs();
    db = new sqlite3.oo1.DB(DEVICE_DB_PATH, 'c', 'opfs-sahpool');
    const appliedVersion = applyDeviceMigrations(sqliteWasmMigrationClient(db));
    reply({ kind: 'ready', appliedVersion, capability: 'opfs' });
    return;
  } catch (opfsError) {
    // Tier 2: session-scoped in-memory database (§4.12 memory tier). Data
    // lives only for this page lifetime — by design, never a silent lie:
    // the main thread keeps the capability label and gates durable features
    // (passcode persistence, offline households) on 'opfs'.
    console.warn('OPFS unavailable, falling back to in-memory device db:', opfsError);
    db = new sqlite3.oo1.DB(':memory:', 'c');
    const appliedVersion = applyDeviceMigrations(sqliteWasmMigrationClient(db));
    reply({ kind: 'ready', appliedVersion, capability: 'memory' });
  }
}

self.onmessage = (event: MessageEvent<DeviceRequest>) => {
  const request = event.data;
  if (request.kind === 'ping') {
    reply({ id: request.id, ok: true, rows: [] });
    return;
  }
  if (db === null) {
    reply({ id: request.id, ok: false, error: 'device database is not open yet' });
    return;
  }
  try {
    const rows = db.exec({
      sql: request.sql,
      bind: request.params,
      rowMode: 'array',
      returnValue: 'resultRows',
    });
    reply({ id: request.id, ok: true, rows });
  } catch (error) {
    reply({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'unknown device query error',
    });
  }
};

bootstrap().catch((error: unknown) => {
  reply({
    kind: 'ready',
    appliedVersion: 0,
    capability: 'none',
    error: error instanceof Error ? error.message : 'device worker bootstrap failed',
  });
});
