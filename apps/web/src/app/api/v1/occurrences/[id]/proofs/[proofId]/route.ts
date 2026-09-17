import { z } from 'zod';
import {
  authenticate,
  occurrencesService,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';
import { getStorage } from '@/lib/server/storage';

const proofParams = z.object({ id: z.string().uuid(), proofId: z.string().uuid() });

/**
 * DELETE /occurrences/:id/proofs/:proofId — completer (terminal) or
 * complete-permission holder (pending) only (§4A.2/D107). The binding row
 * deletes transactionally; the blob removal is best-effort at the storage
 * edge and never blocks the ack.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; proofId: string }> },
) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'responsibilities.complete');
    const { id, proofId } = proofParams.parse(await params);
    const result = (await occurrencesService.removeProof(
      ctx.session.householdId,
      id,
      ctx.effectivePersonId,
      proofId,
    )) as { ok: true; key: string };
    void getStorage()
      .port.remove(result.key)
      .catch(() => undefined);
    return { ok: true };
  });
}
