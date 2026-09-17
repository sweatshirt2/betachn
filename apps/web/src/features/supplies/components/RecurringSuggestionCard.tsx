'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Glyph } from '@/components/ui';
import { useCreateRecurringItem, useDismissSuggestion, useSupplies, useSupplySuggestion } from '..';

const PRESETS = [7, 14, 30];

function daysLabel(days: number, weeks: string, daysWord: string): string {
  return days >= 14
    ? `${Math.round(days / 7)} ${weeks}`
    : `${Math.round(days)} ${daysWord}`;
}

/**
 * D108 suggestion card (§4A.4): born from cycle stats — the server picks the
 * ONE most suggestible supply (≥2 completed cycles, sane average, no existing
 * reminder, not dismissed). Exits per the frozen UX: [Every N] · [Change] ·
 * [Not now] · [Don't suggest again] (persists a synced dismissal).
 * Suggesting NEVER adds to the list or auto-creates anything (micro-74).
 */
export function RecurringSuggestionCard() {
  const { t } = useTranslation();
  const supplies = useSupplies();
  const suggestion = useSupplySuggestion();
  const createReminder = useCreateRecurringItem();
  const dismiss = useDismissSuggestion();
  const [changing, setChanging] = useState(false);
  const [days, setDays] = useState(14);

  if (!suggestion.data || supplies.isPending) return null;
  const candidate = suggestion.data.suggestion;
  if (!candidate) return null;

  const label = daysLabel(candidate.avgCycleDays, t('common.weeks'), t('common.days'));

  return (
    <Card className="lift-hover mt-2">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="bg-wash text-ink flex h-9 w-9 shrink-0 items-center justify-center rounded-[34%]"
        >
          <Glyph name="repeat" className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {t('pantry.suggestLine', { name: candidate.name, every: label })}
          </p>
          <p className="text-muted mt-0.5 text-xs font-semibold">{t('pantry.suggestHint')}</p>

          {changing ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={createReminder.isPending || dismiss.isPending}
                  onClick={() =>
                    createReminder
                      .mutateAsync({
                        name: candidate.name,
                        intervalDays: preset,
                        supplyId: candidate.supplyId,
                        lastBoughtOn: candidate.lastPurchaseAt ?? undefined,
                      })
                      .then(() => dismiss.mutate({ supplyId: candidate.supplyId }))
                  }
                  className={`border-line rounded-full border px-3 py-1 text-xs font-bold ${
                    preset === days ? 'bg-ink text-surface' : 'bg-surface-alt text-ink'
                  }`}
                >
                  {daysLabel(preset, t('common.weeks'), t('common.days'))}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={3}
                  max={365}
                  value={days}
                  onChange={(e) => setDays(Math.min(365, Math.max(3, Number(e.target.value) || 14)))}
                  className="border-line bg-surface w-16 rounded-full border px-2 py-1 text-xs"
                  aria-label={t('pantry.customDaysAria')}
                />
                <Button
                  tone="quiet"
                  disabled={createReminder.isPending || dismiss.isPending}
                  onClick={() =>
                    createReminder
                      .mutateAsync({
                        name: candidate.name,
                        intervalDays: days,
                        supplyId: candidate.supplyId,
                        lastBoughtOn: candidate.lastPurchaseAt ?? undefined,
                      })
                      .then(() => dismiss.mutate({ supplyId: candidate.supplyId }))
                  }
                >
                  {t('common.save')}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setChanging(false)}
                className="text-muted hover:text-ink px-1 text-xs font-bold"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Button
                tone="on-wash"
                disabled={createReminder.isPending || dismiss.isPending}
                onClick={() =>
                  createReminder
                    .mutateAsync({
                      name: candidate.name,
                      intervalDays: Math.round(candidate.avgCycleDays),
                      supplyId: candidate.supplyId,
                      lastBoughtOn: candidate.lastPurchaseAt ?? undefined,
                    })
                    .then(() => dismiss.mutate({ supplyId: candidate.supplyId }))
                }
              >
                {t('pantry.suggestAccept', { every: label })}
              </Button>
              <button
                type="button"
                onClick={() => setChanging(true)}
                className="text-terracotta px-1 text-xs font-bold underline"
              >
                {t('pantry.suggestChange')}
              </button>
              <button
                type="button"
                disabled={dismiss.isPending}
                onClick={() => dismiss.mutate({ supplyId: candidate.supplyId })}
                className="text-muted hover:text-ink px-1 text-xs font-bold"
              >
                {t('pantry.notNow')}
              </button>
              <button
                type="button"
                disabled={dismiss.isPending}
                onClick={() => dismiss.mutate({ supplyId: candidate.supplyId, forever: true })}
                className="text-muted hover:text-ink px-1 text-xs font-bold"
              >
                {t('pantry.suggestNever')}
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
