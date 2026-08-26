import { asExecutor, type Executor, type UnitOfWork } from '@chorify/core';
import { withTransaction, type Executor as PgExecutor } from './withTransaction';

/**
 * PG edge adapter (D67): casts drizzle's node-postgres handle to the
 * dialect-neutral Executor and binds `withTransaction`'s join-or-open
 * semantics into the UnitOfWork seam services depend on.
 */
export function pgUnitOfWork(executor: PgExecutor): UnitOfWork {
  const exec: Executor = asExecutor(executor);
  return {
    exec,
    transact<R>(fn: (tx: Executor) => Promise<R>): Promise<R> {
      return withTransaction(executor, (tx) => fn(asExecutor(tx)));
    },
  };
}
