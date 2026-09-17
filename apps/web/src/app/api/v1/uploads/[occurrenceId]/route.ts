import { authenticate, requireWritable, route } from '@/lib/server';
import { getStorage, proofKey } from '@/lib/server/storage';

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // §4A.2: client compresses ≤5MB

/**
 * POST /api/v1/uploads/:occurrenceId (§4A.2 / D104–D105): store a compressed
 * proof photo blob for an occurrence and return its object key. Raw image
 * bytes in the body (Content-Type carries the format) — no JSON mixing, no
 * multipart. The occurrence scoping rides the path; the household check
 * happens here (key is household-scoped), the completer permission check at
 * the proof-BINDING mutation. The client binds the key afterwards; an
 * unbound upload is garbage-collectable and harmless.
 */
export async function POST(req: Request, { params }: { params: Promise<{ occurrenceId: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const { occurrenceId } = await params;
    const body = await req.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_PROOF_BYTES) {
      const invalid = new Error('Photo must be between 1 byte and 5MB') as Error & { code?: string };
      invalid.code = 'VALIDATION_ERROR';
      throw invalid;
    }
    const contentType = req.headers.get('content-type') ?? 'image/jpeg';
    if (!/^image\/(jpeg|png|webp)$/.test(contentType)) {
      const invalid = new Error('Only JPEG, PNG or WebP photos are accepted') as Error & {
        code?: string;
      };
      invalid.code = 'VALIDATION_ERROR';
      throw invalid;
    }
    const { port } = getStorage();
    const key = proofKey(ctx.session.householdId, occurrenceId, crypto.randomUUID());
    await port.put(key, new Uint8Array(body), contentType);
    return { key };
  });
}
