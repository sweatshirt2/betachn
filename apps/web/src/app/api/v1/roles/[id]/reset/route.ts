import { z } from 'zod';
import {
  authenticate,
  requirePermission,
  requireWritable,
  rolesService,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'household.manage_roles');
    const { id } = idParams.parse(await params);
    const role = await rolesService.reset(ctx.effectivePersonId, ctx.session.householdId, id);
    return { role };
  });
}
