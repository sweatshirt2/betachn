import { aggregateToday, type OccurrenceRecord } from '@chorify/core';
import {
  authenticate,
  homeService,
  householdsService,
  occurrencesService,
  resourcesService,
  responsibilitiesService,
  route,
  socialService,
} from '@/lib/server';
import { DOMAIN_VIEW_KEY, type ActivityDomain } from '@chorify/core';

/** Occurrences render with their chore title — one round trip, no join client-side. */
export type TitledOccurrence = OccurrenceRecord & { title: string };

function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Single round-trip home screen (§4.14). Auth-only: every household member
 * gets a Today screen; per-domain visibility still applies inside activity.
 * Fetch-only controller: all bucketing logic lives in the pure core aggregate
 * (shared with device-mode reads, Phase A).
 */
export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    const householdId = ctx.session.householdId;
    const household = await householdsService.get(householdId);
    const today = todayIn(household.timezone);

    const from = (days: number) => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };

    const [
      occurrencesAll,
      schedules,
      supplies,
      shoppingItems,
      assets,
      serviceRecords,
      allowedActivity,
      responsibilities,
    ] = await Promise.all([
      // One ordered range query feeds every occurrence bucket: today (narrowed
      // in the aggregate), missed-in-grace (all-time, filtered by cadence),
      // upcoming (+1..+7d) and the completed-week count.
      occurrencesService.listRange(householdId, { from: from(-90), to: from(7) }),
      responsibilitiesService.ruleScheduleMap(householdId),
      resourcesService.listSupplies(householdId),
      resourcesService.listShoppingItems(householdId),
      homeService.listAssets(householdId),
      homeService.listServiceRecords(householdId),
      (async () => {
        const allowedDomains = (Object.keys(DOMAIN_VIEW_KEY) as ActivityDomain[]).filter(
          (domain) => ctx.permissionMap[DOMAIN_VIEW_KEY[domain]],
        );
        const page = await socialService.listActivity(householdId, allowedDomains, { limit: 5 });
        return page.events;
      })(),
      responsibilitiesService.list(householdId),
    ]);

    return aggregateToday({
      today,
      occurrences: occurrencesAll,
      schedules,
      responsibilities,
      supplies,
      shoppingItems,
      assets,
      serviceRecords,
      recentActivity: allowedActivity,
    });
  });
}
