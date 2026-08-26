/**
 * Device mirror schema — the local-first system of record (§4.12 / D58).
 * Server-only bookkeeping tables are intentionally absent; see
 * ./households.ts header for the exclusion rationale.
 */
export * from './pending-ops';
export * from './households';
export * from './people-users';
export * from './roles';
export * from './scheduling';
export * from './home';
export * from './resources';
export * from './relations';
export * from './social';
