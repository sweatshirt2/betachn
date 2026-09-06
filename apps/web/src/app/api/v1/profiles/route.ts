import { authenticate, peopleService, requirePermission, route } from '@/lib/server';

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'household.view_people');
    return { people: await peopleService.list(ctx.session.householdId) };
  });
}
