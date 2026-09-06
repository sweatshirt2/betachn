export type RoomPayload = { id: string; name: string; icon: string };
export type AssetPayload = {
  id: string;
  name: string;
  icon: string;
  roomId: string | null;
  maintenanceIntervalDays: number | null;
};
export type AssetDetail = { asset: AssetPayload; nextMaintenanceDue: string | null };
