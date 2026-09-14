'use client';

import { useTranslation } from 'react-i18next';
import { useSupplyEvents, type SupplyPayload } from '@/features/supplies';

/**
 * §4A.4 / D111 facts subline — cycle facts on LOW/OUT supply rows ONLY
 * (user choice: lists stay calm, detail teaches). Facts only, never a
 * nudge: what the household's own history says about this supply.
 */
export function SupplyFactsSubline({ supply }: { supply: SupplyPayload }) {
  const { t } = useTranslation();
  const events = useSupplyEvents(supply.id);

  if (!events.data) return null;
  const { stats } = events.data;
  if (stats.cycleCount === 0 && stats.outCount30d === 0 && stats.outCount90d === 0) {
    return (
      <p className="text-muted mt-1 text-[11px] font-semibold">
        {t('pantry.noFactsYet')}
      </p>
    );
  }

  const parts: string[] = [];
  if (stats.avgCycleDays !== null) {
    const duration =
      stats.avgCycleDays >= 14
        ? `${Math.round(stats.avgCycleDays / 7)} ${t('common.weeks')}`
        : `${Math.round(stats.avgCycleDays)} ${t('common.days')}`;
    parts.push(t('pantry.cycleFacts', { cycles: stats.lowCount90d, days: duration }));
  } else if (stats.outCount30d > 0 || stats.outCount90d > 0) {
    parts.push(t('pantry.outFacts', { out30: stats.outCount30d, out90: stats.outCount90d }));
  }

  return <p className="text-muted mt-1 text-[11px] font-semibold">{parts.join(' · ')}</p>;
}
