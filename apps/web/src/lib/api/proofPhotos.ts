'use client';

import { api } from './client';

/**
 * Proof-photo client (§4A.2 / D104–D107): compress in-browser (canvas →
 * ≤1600px JPEG ~0.8, EXIF/GPS stripped by re-encode), upload raw bytes to
 * /uploads/:occurrenceId, then the caller binds the returned key via
 * POST /occurrences/:id/proofs. Blob OPFS queueing lands with the sync
 * integration (step ③ OPFS queue); online-first here.
 */

export type CompressResult = { bytes: Uint8Array; contentType: 'image/jpeg' };

/** Canvas re-encode: strips metadata/GPS automatically (fresh bitmap). */
export async function compressProof(file: File): Promise<CompressResult> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.8),
  );
  if (!blob) throw new Error('Compression failed');
  if (blob.size > 5 * 1024 * 1024) throw new Error('Photo too large even after compression');
  return { bytes: new Uint8Array(await blob.arrayBuffer()), contentType: 'image/jpeg' };
}

/** Upload raw bytes → object key. Binding is a separate authenticated call. */
export async function uploadProof(occurrenceId: string, photo: CompressResult): Promise<string> {
  const res = await api.post<never, { key: string }>(
    `/uploads/${encodeURIComponent(occurrenceId)}`,
    photo.bytes as unknown as BlobPart,
    { headers: { 'Content-Type': photo.contentType } },
  );
  return res.key;
}

/** Bind the uploaded key — makes the proof part of the occurrence record. */
export async function bindProof(occurrenceId: string, key: string): Promise<void> {
  await api.post(`/occurrences/${encodeURIComponent(occurrenceId)}/proofs`, { key });
}

export async function deleteProof(occurrenceId: string, proofId: string): Promise<void> {
  await api.delete(
    `/occurrences/${encodeURIComponent(occurrenceId)}/proofs/${encodeURIComponent(proofId)}`,
  );
}

export type ProofRow = { id: string; occurrenceId: string; key: string; createdAt: string };

export async function listProofs(occurrenceId: string): Promise<ProofRow[]> {
  return api.get<never, { proofs: ProofRow[] }>(
    `/occurrences/${encodeURIComponent(occurrenceId)}/proofs`,
  ) as unknown as Promise<ProofRow[]>;
}

/** Byte URL for <img src> — rides the auth-checked proxy via axios → blob. */
export async function proofImageUrl(occurrenceId: string, proofId: string): Promise<string> {
  const res = await api.get<never, ArrayBuffer>(
    `/occurrences/${encodeURIComponent(occurrenceId)}/proofs/${encodeURIComponent(proofId)}`,
    { responseType: 'arraybuffer' },
  );
  return URL.createObjectURL(new Blob([res as unknown as BlobPart], { type: 'image/jpeg' }));
}
