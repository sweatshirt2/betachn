import { addServiceRecordSchema } from '@chorify/core';
import { z } from 'zod';
import {
  authenticate,
  homeService,
  readJson,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'home.manage_maintenance');
    const { id } = idParams.parse(await params);
    const input = addServiceRecordSchema.parse(await readJson(req));
    const record = await homeService.addServiceRecord(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { serviceRecord: record };
  });
}
