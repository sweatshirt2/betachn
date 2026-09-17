'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Glyph, Sheet } from '@/components/ui';
import { compressProof, deleteProof, listProofs, uploadProof, bindProof, proofImageUrl, type ProofRow } from '@/lib/api/proofPhotos';

/**
 * Proof-photo sheet (§4A.2 / D106–D107, §4A.4 required-proof UX): live photo
 * strip with capture / review / delete before and after upload. In
 * `required` mode the completion ✓ opens THIS instead of completing —
 * COMPLETE is offered only once ≥1 proof exists ("Add a photo to finish"),
 * blocking but explained, never a surprise error. Skips never route here.
 */
export function ProofSheet({
  occurrenceId,
  onClose,
  onCompleted,
  onComplete,
  isCompleting,
}: {
  occurrenceId: string;
  onClose: () => void;
  /** Required mode: parent performs the actual completion mutation. */
  onComplete: () => void;
  onCompleted: () => void;
  isCompleting: boolean;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofs, setProofs] = useState<ProofRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await listProofs(occurrenceId);
      setProofs(rows);
      const next: Record<string, string> = {};
      await Promise.all(
        rows.map(async (p) => {
          try {
            next[p.id] = await proofImageUrl(occurrenceId, p.id);
          } catch {
            // Offline device: placeholder per D106 ("available when online").
          }
        }),
      );
      setUrls(next);
    } catch {
      setError(t('proofs.loadError'));
    }
  }, [occurrenceId, t]);

  useEffect(() => {
    void refresh();
    return () => {
      // Revoke object URLs on unmount.
      setUrls((prev) => {
        for (const url of Object.values(prev)) URL.revokeObjectURL(url);
        return {};
      });
    };
  }, [refresh]);

  const capture = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const photo = await compressProof(file);
      const key = await uploadProof(occurrenceId, photo);
      await bindProof(occurrenceId, key);
      await refresh();
    } catch {
      setError(t('proofs.captureError'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (proofId: string) => {
    setBusy(true);
    try {
      await deleteProof(occurrenceId, proofId);
      await refresh();
    } catch {
      setError(t('proofs.captureError'));
    } finally {
      setBusy(false);
    }
  };

  const hasProof = proofs.length > 0;

  return (
    <Sheet open onClose={onClose} title={t('proofs.title')}>
      <div className="flex flex-col gap-3">
        {error && <p className="text-clay-red text-sm font-semibold">{error}</p>}
        {proofs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-1">
            {proofs.map((p) => (
              <div key={p.id} className="border-line bg-surface relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border">
                {urls[p.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[p.id]} alt={t('proofs.photoAlt')} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-muted flex h-full w-full items-center justify-center text-[10px]">
                    {t('proofs.offlinePlaceholder')}
                  </div>
                )}
                <button
                  className="bg-clay-red text-cream absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                  onClick={() => void remove(p.id)}
                  disabled={busy}
                  aria-label={t('proofs.deleteAria')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void capture(file);
            e.target.value = '';
          }}
        />
        <div className="flex gap-2">
          <Button tone="quiet" onClick={() => fileRef.current?.click()} disabled={busy} className="flex-1 items-center justify-center gap-2">
            <Glyph name="camera" className="h-4 w-4" aria-hidden />
            {t('proofs.addPhoto')}
          </Button>
          <Button
            onClick={() => {
              onComplete();
              onCompleted();
            }}
            disabled={!hasProof || isCompleting}
            className="flex-1"
          >
            {hasProof ? t('proofs.finish') : t('proofs.addPhotoToFinish')}
          </Button>
        </div>
        {!hasProof && <p className="text-muted text-center text-xs">{t('proofs.requiredHint')}</p>}
      </div>
    </Sheet>
  );
}
