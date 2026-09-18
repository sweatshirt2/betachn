'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button, Sheet } from '@/components/ui';

/**
 * Long-press context sheet (§5.3 / D115, CN micro-19): Reassign / Skip /
 * Details / "Why am I seeing this?" — power actions without added chrome on
 * the rows themselves. Every action here also exists as a visible button
 * somewhere (D115 law: gestures enhance, never replace).
 */
export function OccurrenceContextSheet({
  occurrenceId,
  title,
  choreId,
  canReassign,
  onSkip,
  onReassign,
  onClose,
}: {
  occurrenceId: string | null;
  title: string;
  /** Responsibility id for the Details link. */
  choreId: string;
  canReassign: boolean;
  onSkip: () => void;
  onReassign?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={occurrenceId !== null} onClose={onClose} title={title}>
      <div className="flex flex-col gap-1.5">
        {canReassign && onReassign && (
          <Button
            tone="quiet"
            className="w-full"
            onClick={() => {
              onClose();
              onReassign();
            }}
          >
            {t('chores.reassign')}
          </Button>
        )}
        <Button
          tone="quiet"
          className="w-full"
          onClick={() => {
            onClose();
            onSkip();
          }}
        >
          {t('today.skipAction')}
        </Button>
        <Link href={`/chores/${choreId}`} className="w-full">
          <Button tone="quiet" className="w-full">
            {t('chores.open')}
          </Button>
        </Link>
      </div>
      <p className="text-muted mt-3 text-xs">{t('today.whySeeingHint')}</p>
      <Button tone="quiet" className="mt-4 w-full" onClick={onClose}>
        {t('common.cancel')}
      </Button>
    </Sheet>
  );
}
