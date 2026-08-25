import { PgTransaction } from 'drizzle-orm/pg-core';
import type { Database } from './client';

/** A live drizzle transaction — derived from drizzle's own callback signature. */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Anything a service may receive as its database handle: the root db or a transaction. */
export type Executor = Database | Tx;

/**
 * Runs `fn` inside a transaction, reusing the caller's transaction when one is
 * already active (nested calls join instead of opening savepoint soup).
 */
export async function withTransaction<R>(
  executor: Executor,
  fn: (tx: Tx) => Promise<R>,
): Promise<R> {
  if (executor instanceof PgTransaction) return fn(executor);
  return executor.transaction(fn);
}
