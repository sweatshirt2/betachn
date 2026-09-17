import { z } from 'zod';
import { proofBindSchema } from '@chorify/core';
import {
  authenticate,
  occurrencesService,
  readJson,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

/** POST /occurrences/:id/proofs — bind an uploaded blob key (§4A.2/D105). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const { id } = idParams.parse(await params);
    const { key } = proofBindSchema.parse(await readJson(req));
    requirePermission(ctx, 'responsibilities.complete');
    const proof = await occurrencesService.bindProof(
      ctx.session.householdId,
      id,
      ctx.effectivePersonId,
      ctx.permissionMap['responsibilities.complete'],
      key,
    );
    return { proof };
  });
}

/** GET /occurrences/:id/proofs — list bindings (view = occurrence visibility). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    const { id } = idParams.parse(await params);
    const proofs = await occurrencesService.listProofs(ctx.session.householdId, id);
    return { proofs };
  });
}
