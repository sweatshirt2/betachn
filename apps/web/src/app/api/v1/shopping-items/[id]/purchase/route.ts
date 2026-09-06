import { z } from 'zod';
import {
  authenticate,
  requirePermission,
  requireWritable,
  resourcesService,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_purchases');
    const { id } = idParams.parse(await params);
    const item = await resourcesService.purchase(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
    );
    return { item };
  });
}
