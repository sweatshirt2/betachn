import {
  DOMAIN_VIEW_KEY,
  isWithinGraceWindow,
  type ActivityDomain,
  type OccurrenceRecord,
} from '@chorify/core';
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

function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffDays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Single round-trip home screen (§4.14). Auth-only: every household member
 * gets a Today screen; per-domain visibility still applies inside activity.
 */
export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    const householdId = ctx.session.householdId;
    const household = await householdsService.get(householdId);
    const today = todayIn(household.timezone);

    const [
      dueToday,
      schedules,
      supplies,
      shoppingItems,
      assets,
      allowedActivity,
      responsibilities,
    ] = await Promise.all([
      occurrencesService.listRange(householdId, { from: today, to: today }),
      responsibilitiesService.ruleScheduleMap(householdId),
      resourcesService.listSupplies(householdId),
      resourcesService.listShoppingItems(householdId),
      homeService.listAssets(householdId),
      (async () => {
          const allowedDomains = (Object.keys(DOMAIN_VIEW_KEY) as ActivityDomain[]).filter(
            (domain) => ctx.permissionMap[DOMAIN_VIEW_KEY[domain]],
          );
          const page = await socialService.listActivity(householdId, allowedDomains, { limit: 5 });
          return page.events;
        })(),
        responsibilitiesService.list(householdId),
      ]);

    const titles = new Map(responsibilities.map((r) => [r.id, r.title] as const));
    const withTitle = (o: OccurrenceRecord): TitledOccurrence => ({
      ...o,
      title: titles.get(o.responsibilityId) ?? 'Chore',
    });

    const todayOccurrences = dueToday.filter((o) => o.status === 'pending').map(withTitle);

    const missedAll = await occurrencesService.listRange(householdId, { status: 'missed' });
    const missedInGrace = missedAll
      .filter((o) => {
        const schedule = schedules[o.ruleId];
        if (!schedule) return false;
        return isWithinGraceWindow(schedule.pattern, schedule.interval, o.dueDate, today, diffDays);
      })
      .map(withTitle);

    const upcoming = (
      await occurrencesService.listRange(householdId, {
        from: addDaysIso(today, 1),
        to: addDaysIso(today, 7),
        status: 'pending',
      })
    )
      .slice(0, 20)
      .map(withTitle);

    const lowSupplies = supplies.filter((s) => s.state === 'low' || s.state === 'out');
    const openShoppingItems = shoppingItems.filter((i) => i.purchasedAt === null).slice(0, 20);

    const horizon = addDaysIso(today, 7);
    const maintenanceDue: Array<{ assetId: string; assetName: string; nextDue: string }> = [];
    for (const asset of assets) {
      const nextDue = await homeService.nextMaintenanceDueFor(householdId, asset.id, today);
      if (nextDue && nextDue <= horizon) {
        maintenanceDue.push({ assetId: asset.id, assetName: asset.name, nextDue });
      }
    }

    const weekAgo = addDaysIso(today, -6);
    const completedThisWeek = (
      await occurrencesService.listRange(householdId, { from: weekAgo, to: today, status: 'completed' })
    ).length;

    return {
      todayOccurrences,
      missedInGrace,
      upcoming,
      lowSupplies,
      openShoppingItems,
      maintenanceDue,
      recentActivity: allowedActivity,
      completedThisWeek,
    };
  });
}
