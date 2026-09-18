'use client';

import { useTranslation } from 'react-i18next';
import { Button, PersonAvatar, Sheet } from '@/components/ui';
import { useCreateSwap } from '../api/chores.mutations';

/**
 * Swap request sheet (§16b / D113): the current assignee offers THIS turn to
 * another member. Mutual consent — no owner approval — so the sheet is a
 * plain person picker with a warm hint.
 */
export function SwapSheet({
  open,
  occurrenceId,
  people,
  excludePersonId,
  onClose,
}: {
  open: boolean;
  occurrenceId: string | null;
  /** Candidate members (id + name), excluding the requester. */
  people: Array<{ id: string; name: string }>;
  /** The requester — not selectable as the target. */
  excludePersonId?: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const createSwap = useCreateSwap();
  const candidates = people.filter((p) => p.id !== excludePersonId);

  const offer = (toPersonId: string) => {
    if (!occurrenceId) return;
    createSwap.mutate({ occurrenceId, toPersonId }, { onSuccess: onClose });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('chores.swapSheetTitle')}>
      <p className="text-muted text-sm">{t('chores.swapSheetHint')}</p>
      <p className="text-muted mt-3 text-xs font-bold uppercase tracking-wide">
        {t('chores.swapToLabel')}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {candidates.length === 0 && <p className="text-muted py-4 text-sm">{t('common.loadError')}</p>}
        {candidates.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={createSwap.isPending}
            onClick={() => offer(p.id)}
            className="bg-card-wash border-line shadow-soft lift-hover flex w-full items-center gap-3 rounded-xl border p-3 text-start disabled:opacity-60"
          >
            <PersonAvatar name={p.name} size="sm" />
            <span className="flex-1 text-sm font-semibold">{p.name}</span>
          </button>
        ))}
      </div>
      <Button tone="quiet" className="mt-4 w-full" onClick={onClose}>
        {t('common.cancel')}
      </Button>
    </Sheet>
  );
}
