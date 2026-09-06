import { z } from 'zod';
import { AppError, DOMAIN_VIEW_KEY, type ActivityDomain } from '@chorify/core';
import {
  authenticate,
  requirePermission,
  responsibilitiesService,
  route,
  socialService,
} from '@/lib/server';

const feedQuery = z.object({
  member: z.string().uuid().optional(),
  action: z.string().max(60).optional(),
  chore: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'household.view_people');
    const url = new URL(req.url);
    const query = feedQuery.parse({
      member: url.searchParams.get('member') ?? undefined,
      action: url.searchParams.get('action') ?? undefined,
      chore: url.searchParams.get('chore') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });
    // No-indirect-leakage (CN XIX-4): the feed filters server-side to the
    // viewer's domains, mirroring the sync visibility gate.
    const allowedDomains = (Object.keys(DOMAIN_VIEW_KEY) as ActivityDomain[]).filter(
      (domain) => ctx.permissionMap[DOMAIN_VIEW_KEY[domain]],
    );
    // Chore filter resolves through the responsibility title snapshot.
    let responsibilityTitle: string | undefined;
    if (query.chore) {
      const all = await responsibilitiesService.list(ctx.session.householdId, { includeArchived: true });
      const match = all.find((r) => r.id === query.chore);
      if (!match) throw new AppError('NOT_FOUND', 'Responsibility not found');
      responsibilityTitle = match.title;
    }
    const page = await socialService.listActivity(ctx.session.householdId, allowedDomains, {
      actorPersonId: query.member,
      actionType: query.action,
      responsibilityTitle,
      fromDate: query.from,
      toDate: query.to,
      limit: query.limit,
      cursor: query.cursor,
    });
    return { events: page.events, nextCursor: page.nextCursor };
  });
}
