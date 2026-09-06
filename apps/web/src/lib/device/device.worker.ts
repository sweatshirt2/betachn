/**
 * Device-database worker: SQLite-WASM over OPFS lives HERE, never on the
 * main thread (sync access handles are worker-only). Bootstrap:
 * init wasm → install SAH pool → open OpfsDb → run the device migration
 * track (same track as Node, via the wasm MigrationClient adapter) →
 * serve query messages for the sqlite-proxy drizzle handle in openDevice.ts.
 */
import { applyDeviceMigrations } from '@chorify/local-db/apply-migrations';
import { DEVICE_DB_PATH, sqliteWasmMigrationClient, type DeviceRequest, type DeviceResponse, type WasmDb } from './migrationClient';

type SqliteInit = (options?: {
  print?: (message: string) => void;
  printErr?: (message: string) => void;
  locateFile?: (path: string) => string;
}) => Promise<{
  oo1: {
    OpfsDb: new (path: string, flags: string) => WasmDb;
  };
  installOpfsSAHPoolVfs: (options?: unknown) => Promise<unknown>;
}>;

let db: WasmDb | null = null;

async function bootstrap(): Promise<number> {
  const { default: initModule } = (await import('@sqlite.org/sqlite-wasm')) as unknown as {
    default: SqliteInit;
  };
  const sqlite3 = await initModule({
    print: () => {},
    printErr: () => {},
    locateFile: (path) => `/sqlite3-wasm/${path}`,
  });
  await sqlite3.installOpfsSAHPoolVfs();
  db = new sqlite3.oo1.OpfsDb(DEVICE_DB_PATH, 'c');
  return applyDeviceMigrations(sqliteWasmMigrationClient(db));
}

function reply(response: DeviceResponse): void {
  self.postMessage(response);
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

bootstrap()
  .then((appliedVersion) => reply({ kind: 'ready', appliedVersion }))
  .catch((error: unknown) => {
    throw error instanceof Error ? error : new Error('device worker bootstrap failed');
  });
