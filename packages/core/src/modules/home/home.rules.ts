import { addDays } from '../../schedule';

/**
 * Next maintenance due date (§6 semantics, mirrored on the db model comment):
 * `max(serviced_on) + asset.maintenance_interval_days`, else null.
 *
 * - Asset without an interval → never auto-due → null.
 * - Asset never serviced → no anchor yet → null (`todayIso` is part of the
 *   contract for callers that layer "due soon" windows on top; the pure
 *   next-due answer does not depend on it).
 */
export function nextMaintenanceDue(
  asset: { maintenanceIntervalDays: number | null | undefined },
  lastServicedOn: string | null,
  todayIso: string,
): string | null {
  if (!asset.maintenanceIntervalDays || !lastServicedOn) return null;
  return addDays(lastServicedOn, asset.maintenanceIntervalDays);
}
