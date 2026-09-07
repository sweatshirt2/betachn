import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { detectBrowserCapability, type DeviceCapability } from '@chorify/local-db/capability';
import * as schema from '@chorify/local-db/schema';
import type { DeviceRequest, DeviceResponse } from './migrationClient';

export type BrowserDevice =
  | { capability: 'online-only' | 'memory'; db: null }
  | { capability: 'opfs'; db: ReturnType<typeof drizzle<typeof schema>>; worker: Worker };

/**
 * Main-thread device opener. OPFS-capable browsers get a worker-backed
 * sqlite-proxy drizzle handle (migrations already applied at worker
 * bootstrap); anything else reports its capability so the UI can show the
 * online-required / memory-mode hint instead of failing obscurely.
 *
 * The open is MEMOIZED — one worker per page lifetime, shared by reads,
 * writes and the sync engine's flush loop (a per-call worker would leak).
 */
let openPromise: Promise<BrowserDevice> | null = null;

export async function openBrowserDevice(): Promise<BrowserDevice> {
  if (openPromise === null) {
    openPromise = openOnce().catch((err) => {
      openPromise = null; // allow a retry after a transient failure
      throw err;
    });
  }
  return openPromise;
}

async function openOnce(): Promise<BrowserDevice> {
  const capability: DeviceCapability = detectBrowserCapability();
  if (capability !== 'opfs') return { capability, db: null };

  const worker = new Worker(new URL('./device.worker.ts', import.meta.url));
  await waitForReady(worker);

  let nextId = 1;
  const pending = new Map<number, (response: DeviceResponse) => void>();
  worker.onmessage = (event: MessageEvent<DeviceResponse>) => {
    const response = event.data;
    if ('id' in response) pending.get(response.id)?.(response);
  };

  const db = drizzle<typeof schema>(async (sql, params) => {
    const id = nextId++;
    const response = await new Promise<DeviceResponse>((resolve) => {
      pending.set(id, resolve);
      const request: DeviceRequest = { id, kind: 'query', sql, params };
      worker.postMessage(request);
    });
    pending.delete(id);
    if (!('id' in response)) throw new Error('unexpected device worker message');
    if (!response.ok) throw new Error(response.error);
    return { rows: response.rows };
  });

  return { capability: 'opfs', db, worker };
}

function waitForReady(worker: Worker): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('device worker bootstrap timed out')), 30_000);
    worker.onmessage = (event: MessageEvent<DeviceResponse>) => {
      if ('kind' in event.data && event.data.kind === 'ready') {
        clearTimeout(timeout);
        resolve();
      }
    };
    worker.onerror = (event) => {
      clearTimeout(timeout);
      reject(event.error instanceof Error ? event.error : new Error('device worker failed to start'));
    };
  });
}
