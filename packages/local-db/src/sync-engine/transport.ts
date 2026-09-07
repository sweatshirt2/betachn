import type { SyncDomain, AudienceType, ChangeOp } from '@chorify/core';

/** One queued device mutation as it travels to POST /sync/push. */
export interface SyncOpWire {
  uuid: string;
  entity: string;
  entityId: string;
  op: ChangeOp;
  payload: Record<string, unknown>;
  audienceType: AudienceType;
  audienceIds: string[];
  domain: SyncDomain;
}

export interface PullChangeWire {
  seq: number;
  actorPersonId: string | null;
  entity: string;
  entityId: string;
  op: ChangeOp;
  payload: Record<string, unknown>;
}

export interface PushOutcomeWire {
  uuid: string;
  status: 'accepted' | 'duplicate' | 'rejected';
  reason?: 'FORBIDDEN_DOMAIN';
  /** Feed seq assigned to an accepted op — powers cross-flush loss detection. */
  seq?: number;
}

export interface BootstrapSnapshot {
  cursor: number;
  sections: Record<string, Array<Record<string, unknown>>>;
}

/**
 * Server-sync transport port (§4.12). The engine depends on THIS only —
 * fetch/axios adapters live at the app edge, fakes live in tests.
 */
export interface SyncTransport {
  push(householdCode: string, ops: SyncOpWire[], token: string): Promise<PushOutcomeWire[]>;
  pull(
    householdCode: string,
    sinceSeq: number,
    token: string,
    limit?: number,
  ): Promise<{ changes: PullChangeWire[]; cursor: number; hasMore: boolean }>;
  bootstrap(householdCode: string, token: string): Promise<BootstrapSnapshot>;
}

const API = '/api/v1';

async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string } }
    | null;
  if (!response.ok || !body || body.error) {
    throw new Error(body?.error?.code ?? `HTTP ${response.status}`);
  }
  return body.data as T;
}

/** Fetch-based adapter against the frozen §4.14 REST surface. */
export function fetchSyncTransport(baseUrl = ''): SyncTransport {
  const root = baseUrl + API;
  return {
    async push(householdCode, ops, token) {
      const response = await fetch(`${root}/sync/push`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ householdCode, ops }),
      });
      return unwrap<{ outcomes: PushOutcomeWire[] }>(response).then((r) => r.outcomes);
    },
    async pull(householdCode, sinceSeq, token, limit = 500) {
      const query = new URLSearchParams({
        householdCode,
        since: String(sinceSeq),
        limit: String(limit),
      });
      const response = await fetch(`${root}/sync/pull?${query}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      return unwrap(response);
    },
    async bootstrap(householdCode, token) {
      const query = new URLSearchParams({ householdCode });
      const response = await fetch(`${root}/sync/bootstrap?${query}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      return unwrap(response);
    },
  };
}
