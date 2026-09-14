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
