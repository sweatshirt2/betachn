import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from '@chorify/local-db/schema';
import type { DeviceCapability, DeviceRequest, DeviceResponse } from './migrationClient';

export type BrowserDevice =
  | { capability: 'opfs' | 'memory'; db: ReturnType<typeof drizzle<typeof schema>>; worker: Worker }
  | { capability: 'none'; db: null };

/**
 * Main-thread device opener (§4.12 capability ladder, worker-authoritative).
 * The worker owns the truth: it attempts OPFS, falls back to an in-memory
 * session tier, and reports what it achieved in its ready message. The main
 * thread no longer guesses from main-thread API presence — SAH is a
 * worker-only API, so a window-side probe misclassifies every browser.
 *
 * The open is MEMOIZED — one worker per page lifetime, shared by reads,
 * writes, the gate store and the sync engine's flush loop.
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
  if (typeof Worker === 'undefined') return { capability: 'none', db: null };

  const worker = new Worker(new URL('./device.worker.ts', import.meta.url));
  const ready = await waitForReady(worker);

  if (ready.capability === 'none') {
    worker.terminate();
    return { capability: 'none', db: null };
  }

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

  return { capability: ready.capability, db, worker };
}

interface WorkerReady {
  capability: DeviceCapability;
  error?: string;
}

function waitForReady(worker: Worker): Promise<WorkerReady> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('device worker bootstrap timed out')), 30_000);
    worker.onmessage = (event: MessageEvent<DeviceResponse>) => {
      if ('kind' in event.data && event.data.kind === 'ready') {
        clearTimeout(timeout);
        resolve(event.data);
      }
    };
    worker.onerror = (event) => {
      clearTimeout(timeout);
      reject(event.error instanceof Error ? event.error : new Error('device worker failed to start'));
    };
  });
}
