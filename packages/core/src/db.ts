import type { SQL } from 'drizzle-orm';

/**
 * Dialect-neutral executor surface (§12 step-3 decision).
 *
 * Core services depend on THIS interface only — never on a driver package
 * (`node-postgres`, better-sqlite3, sqlite-wasm). Each holder of a concrete
 * drizzle handle casts it at its own edge via {@link asExecutor}; the cast is
 * truthful because every member below mirrors the exact call shape of BOTH
 * drizzle dialects for the subset services use.
 *
 * Row payloads never travel through these generics: rows cross into domain
 * code through `<domain>.schema.ts` zod `.parse()` at service boundaries
 * (parse, don't cast — §4.18). Conditions are built with `eq/and/…` against
 * the caller's typed tables; both dialects produce the same `SQL`.
 */
export type Row = Record<string, unknown>;
export type RowValues = Row;

/** Relational-query config subset (drizzle accepts all of these in both dialects). */
export interface FindConfig {
  where?: SQL | undefined;
  /** Relations graph, e.g. `{ role: true }`. */
  with?: unknown;
  /** Column projection. */
  columns?: unknown;
  orderBy?: unknown;
  limit?: number;
  offset?: number;
}

export interface RelationalQuery {
  findFirst(config?: FindConfig): Promise<Row | undefined>;
  findMany(config?: FindConfig): Promise<Row[]>;
}

export interface InsertFinal {
  returning(): Promise<Row[]>;
}

export interface InsertValuesChain extends InsertFinal {
  onConflictDoNothing(): InsertFinal;
  onConflictDoUpdate(config: { target: unknown; set: RowValues }): InsertFinal;
}

export interface UpdateWhereChain {
  returning(): Promise<Row[]>;
}

export interface Executor {
  readonly query: Readonly<Record<string, RelationalQuery>>;
  insert(table: object): { values(values: RowValues | RowValues[]): InsertValuesChain };
  update(table: object): {
    set(values: RowValues): { where(condition: SQL): UpdateWhereChain };
  };
  delete(table: object): { where(condition: SQL): Promise<void> };
}

/**
 * Transaction seam. Services receive one of these instead of a bare handle so
 * multi-write operations stay atomic regardless of which driver backs it:
 * the pg adapter joins/reuses via `withTransaction`, a device adapter wraps
 * its SQLite transaction. Nested calls join the ambient scope — never
 * savepoint soup (§4.3.8).
 */
export interface UnitOfWork {
  /** Handle for reads/writes inside the current (possibly nested) scope. */
  readonly exec: Executor;
  transact<R>(fn: (tx: Executor) => Promise<R>): Promise<R>;
}

/**
 * Edge cast: concrete driver handle → neutral executor. The double widening
 * is deliberate and documented — variance between drizzle's builder types and
 * this structural surface is resolved by construction (identical call shapes),
 * not by runtime wrapping, so zero allocation per call.
 */
export function asExecutor(handle: unknown): Executor {
  return handle as Executor;
}
