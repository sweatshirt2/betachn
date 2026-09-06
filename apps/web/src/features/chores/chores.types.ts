export type OccurrenceStatus = 'pending' | 'completed' | 'skipped' | 'missed';

export type TitledOccurrence = {
  id: string;
  responsibilityId: string;
  ruleId: string;
  dueDate: string;
  personIds: string[];
  status: OccurrenceStatus;
  completedByPersonId: string | null;
  title: string;
};

export type SupplyPayload = { id: string; name: string; state: string };
export type ShoppingItemPayload = { id: string; name: string; purchasedAt: string | null };
export type MaintenancePayload = { assetId: string; assetName: string; nextDue: string };

export type TodayPayload = {
  todayOccurrences: TitledOccurrence[];
  missedInGrace: TitledOccurrence[];
  upcoming: TitledOccurrence[];
  lowSupplies: SupplyPayload[];
  openShoppingItems: ShoppingItemPayload[];
  maintenanceDue: MaintenancePayload[];
  recentActivity: Array<{ type: string; payload: Record<string, unknown> }>;
  completedThisWeek: number;
};

export type OccurrenceAction =
  | { action: 'complete'; note?: string }
  | { action: 'skip'; skipReason?: string }
  | { action: 'reopen' }
  | { action: 'reassign'; personIds: string[] };
