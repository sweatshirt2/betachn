import { AppError } from '@chorify/core';
import {
  authenticate,
  portabilityService,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'household.view_people');
    if (!ctx.session.userId) {
      throw new AppError('CONFLICT', 'Register an account before importing a household copy');
    }
    const text = await req.text();
    return portabilityService.importForAdoption(text, {
      userId: ctx.session.userId,
      householdId: ctx.session.householdId,
    });
  });
}
