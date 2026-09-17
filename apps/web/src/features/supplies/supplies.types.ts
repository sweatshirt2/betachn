export type SupplyState = 'available' | 'low' | 'out';
export type SupplyPayload = { id: string; name: string; state: SupplyState };

export type SupplyCycleStats = {
  cycleCount: number;
  avgCycleDays: number | null;
  lastCycleDays: number | null;
  outCount30d: number;
  outCount90d: number;
  lowCount90d: number;
};
export type SupplyEventPayload = {
  id: string;
  type: 'created' | 'restocked' | 'marked_low' | 'marked_out';
  source: 'manual' | 'purchase';
  quantityText: string | null;
  occurredAt: string;
};

/** Recurring buy reminder wire shape (§4A.3 / D108–D110). */
export type RecurringStateKind = 'idle' | 'due' | 'snoozed' | 'onList' | 'overdue';
export type RecurringSuggestionPayload = {
  supplyId: string;
  name: string;
  avgCycleDays: number;
  lastPurchaseAt: string | null;
} | null;
export type RecurringItemPayload = {
  id: string;
  name: string;
  supplyId: string | null;
  intervalDays: number;
  quantityText: string | null;
  note: string | null;
  lastPurchaseAt: string | null;
  snoozedUntil: string | null;
  state: 'active' | 'paused';
  archivedAt: string | null;
};
