export type SupplyState = 'available' | 'low' | 'out';
export type SupplyPayload = { id: string; name: string; state: SupplyState };
