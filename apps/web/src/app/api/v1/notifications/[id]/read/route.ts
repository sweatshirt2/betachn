import { z } from 'zod';
import { authenticate, requireWritable, route, socialService } from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const { id } = idParams.parse(await params);
    const notification = await socialService.markNotificationRead(
      ctx.session.householdId,
      ctx.effectivePersonId,
      id,
    );
    return { notification };
  });
}
