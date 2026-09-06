import { z } from 'zod';
import { SYNC_ENTITIES } from '@chorify/core';
import {
  authenticate,
  readJson,
  requireWritable,
  route,
  syncService,
  syncViewer,
} from '@/lib/server';

const pushOpSchema = z.object({
  uuid: z.string().uuid(),
  entity: z.enum(SYNC_ENTITIES as unknown as [string, ...string[]]),
  entityId: z.string(),
  op: z.enum(['create', 'update', 'delete']),
  payload: z.record(z.string(), z.unknown()),
  audienceType: z.enum(['members', 'roles', 'all']),
  audienceIds: z.array(z.string()),
  domain: z.enum(['household', 'responsibilities', 'finances', 'home', 'resources']),
});

const pushBodySchema = z.object({ ops: z.array(pushOpSchema).max(500) });

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const { ops } = pushBodySchema.parse(await readJson(req));
    const outcomes = await syncService.push(
      await syncViewer(ctx),
      ops as Parameters<typeof syncService.push>[1],
    );
    return { outcomes };
  });
}
