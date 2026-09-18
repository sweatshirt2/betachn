'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Chip,
  ChoreCheck,
  EmptyState,
  Glyph,
  GlyphTile,
  SectionWatermark,
  Skeleton,
  SwipeCard,
  TaskActionRow,
  TaskMissedRow,
  TaskUpcomingRow,
  storedIconGlyph,
  supplyGlyph,
  crayon,
} from '@/components/ui';
import {
  useOccurrenceAct,
  useResolveSwap,
  useSwaps,
  useToday,
  usePeopleMap,
  OccurrenceContextSheet,
  type TitledOccurrence,
} from '@/features/chores';
import { formatDate } from '@/lib/dates';
import { flushNow } from '@/lib/sync/syncClient';
import { usePullToRefresh } from '@/lib/pullToRefresh';
import { useLongPress } from '@/lib/gestures';
import { usePermission } from '@/lib/permissions';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

/** Whole days an occurrence is past due (missed-in-grace rows). */
function daysLate(dueDate: string): number {
  const due = new Date(`${dueDate}T00:00:00Z`).getTime();
  const now = Date.now();
  return Math.max(1, Math.floor((now - due) / 86_400_000));
}

/**
 * Long-press → context sheet opener for one task row (D115): touch-only,
 * wraps the row and reports the occurrence upward; visual press cue via a
 * soft scale on the wrapped content.
 */
function LongPressTaskRow({
  occurrence,
  onOpen,
  children,
}: {
  occurrence: TitledOccurrence;
  onOpen: (o: TitledOccurrence) => void;
  children: React.ReactNode;
}) {
  const { pressing, handlers } = useLongPress(() => onOpen(occurrence));
  return (
    <div {...handlers} style={{ touchAction: 'pan-y' }}>
      <div
        style={{
          transform: pressing ? 'scale(0.985)' : 'scale(1)',
          transition: 'transform 150ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function TodayPage() {
  const { t } = useTranslation();
  const today = useToday();
  const act = useOccurrenceAct();
  const people = usePeopleMap();
  const incomingSwaps = useSwaps('incoming');
  const resolveSwap = useResolveSwap();
  const canReassign = usePermission('responsibilities.reassign');
  const [contextFor, setContextFor] = useState<TitledOccurrence | null>(null);
  const mode = useSelector((state: RootState) => state.auth.mode);

  // Pull-to-refresh (D115): device households flush the sync engine (push +
  // pull + cache invalidation ride refreshAfterFlush); server households
  // just refetch. Same paths as the visible retry controls.
  const { pull, refreshing, handlers: ptrHandlers } = usePullToRefresh(async () => {
    if (mode === 'device') {
      await flushNow();
    } else {
      await today.refetch();
    }
  });
  const names = new Map((people.data?.people ?? []).map((p) => [p.id, p.name] as const));

  if (today.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (today.isError) {
    return (
      <EmptyState
        art="cloud"
        title={t('common.loadError')}
        hint={t('common.checkConnection')}
        action={<Button onClick={() => today.refetch()}>{t('common.retry')}</Button>}
      />
    );
  }

  const data = today.data;
  const todayIso = new Date().toISOString().slice(0, 10);
  const assigneeLabel = (o: TitledOccurrence) => {
    if (o.personIds.length === 0) return t('today.upForGrabs');
    return o.personIds.map((id) => names.get(id) ?? '…').join(', ');
  };

  const assigneePeople = (o: TitledOccurrence) =>
    o.personIds.map((id) => {
      const name = names.get(id) ?? '?';
      return { label: name };
    });

  const swaps = incomingSwaps.data?.swaps ?? [];

  return (
    <div className="page-enter relative" data-ptr-root {...ptrHandlers}>
      {/* Pull-to-refresh indicator (D115): touch-only, subtle. */}
      {(pull > 0 || refreshing) && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center text-xs font-bold text-ink/60"
          style={{ height: Math.max(pull, refreshing ? 28 : 0) }}
        >
          {refreshing ? '…' : pull >= 72 ? '↑' : '↓'}
        </div>
      )}
      <SectionWatermark variant="leaves" />

      {swaps.length > 0 && (
        <section aria-label={t('chores.swapIncomingTitle')} className="mb-6">
          <h2 className="font-display text-xl">{t('chores.swapIncomingTitle')}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {swaps.map((s) => {
              const occurrence =
                data.todayOccurrences.find((o) => o.id === s.occurrenceId) ??
                data.upcoming.find((o) => o.id === s.occurrenceId);
              return (
                <Card key={s.id} className="flex flex-wrap items-center gap-2 py-3">
                  <p className="min-w-0 flex-1 text-sm">
                    {t('chores.swapIncomingLine', {
                      who: names.get(s.fromPersonId) ?? '…',
                      title: occurrence?.title ?? t('chores.title'),
                      date: occurrence ? formatDate(occurrence.dueDate) : '',
                    })}
                  </p>
                  <Button
                    disabled={resolveSwap.isPending}
                    onClick={() => resolveSwap.mutate({ occurrenceId: s.occurrenceId, swapId: s.id, action: 'accept' })}
                  >
                    {t('chores.swapAccept')}
                  </Button>
                  <Button
                    tone="quiet"
                    disabled={resolveSwap.isPending}
                    onClick={() => resolveSwap.mutate({ occurrenceId: s.occurrenceId, swapId: s.id, action: 'decline' })}
                  >
                    {t('chores.swapDecline')}
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}
      <section aria-label={t('today.today')}>
        <h2 className="font-display text-xl">{t('today.today')}</h2>
        {data.todayOccurrences.length === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('today.empty')}</p>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            {data.todayOccurrences.map((o, index) => (
              <LongPressTaskRow key={o.id} occurrence={o} onOpen={setContextFor}>
                <SwipeCard
                  onSwipeRight={() => act.mutate({ id: o.id, action: 'complete' })}
                  onSwipeLeft={() => act.mutate({ id: o.id, action: 'skip' })}
                >
                  <TaskActionRow
                    className="stagger-item"
                    style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
                    accent={crayon(index)}
                    title={o.title}
                    meta={assigneeLabel(o)}
                    glyph={storedIconGlyph(o.icon, o.title)}
                    people={assigneePeople(o)}
                    action={
                      <ChoreCheck
                        done={o.status === 'completed'}
                        disabled={act.isPending}
                        onClick={() => act.mutate({ id: o.id, action: 'complete' })}
                        label={t('chores.completeAria', { title: o.title })}
                      />
                    }
                  />
                </SwipeCard>
              </LongPressTaskRow>
            ))}
          </div>
        )}
      </section>

      {data.missedInGrace.length > 0 && (
        <section aria-label={t('today.missedRecently')} className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl">{t('today.missedRecently')}</h2>
            <Chip tone="danger">{data.missedInGrace.length}</Chip>
          </div>
          <p className="text-muted mt-0.5 text-xs font-semibold">{t('today.missedHint')}</p>
          <div className="mt-2 flex flex-col gap-2.5">
            {data.missedInGrace.map((o, index) => (
              <LongPressTaskRow key={o.id} occurrence={o} onOpen={setContextFor}>
              <SwipeCard
                onSwipeRight={() => act.mutate({ id: o.id, action: 'complete' })}
                onSwipeLeft={() => act.mutate({ id: o.id, action: 'skip' })}
              >
                <TaskMissedRow
                  className="stagger-item"
                  style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
                  title={o.title}
                  meta={assigneeLabel(o)}
                  glyph={storedIconGlyph(o.icon, o.title)}
                  chip={
                    <span
                      className="text-ink/80 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: 'var(--chorify-danger-soft)' }}
                      title={formatDate(o.dueDate)}
                    >
                      {t('today.daysLate', { count: daysLate(o.dueDate) })}
                    </span>
                  }
                  people={assigneePeople(o)}
                  secondaryAction={
                    <Button
                      tone="quiet"
                      className="h-10 w-10 !px-0"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: o.id, action: 'skip' })}
                      aria-label={t('today.skipAria', { title: o.title })}
                    >
                      <Glyph name="skip" className="h-4.5 w-4.5" aria-hidden />
                    </Button>
                  }
                  action={
                    <ChoreCheck
                      done={false}
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: o.id, action: 'complete' })}
                      label={t('chores.completeAria', { title: o.title })}
                    />
                  }
                />
              </SwipeCard>
              </LongPressTaskRow>
            ))}
          </div>
        </section>
      )}

      <OccurrenceContextSheet
        occurrenceId={contextFor?.id ?? null}
        title={contextFor?.title ?? ''}
        choreId={contextFor?.responsibilityId ?? ''}
        canReassign={canReassign}
        onSkip={() => {
          if (contextFor) act.mutate({ id: contextFor.id, action: 'skip' });
        }}
        onClose={() => setContextFor(null)}
      />

      {(data.lowSupplies.length > 0 || data.maintenanceDue.length > 0) && (
        <section aria-label={t('today.attention')} className="mt-6">
          <h2 className="font-display text-xl">{t('today.attention')}</h2>
          <div className="mt-2 flex flex-col gap-2.5">
            {data.lowSupplies.map((s, index) => (
              <Card key={s.id} className="lift-hover flex items-center gap-3 px-3 py-2.5">
                <GlyphTile glyph={supplyGlyph(s.name)} wash="var(--chorify-danger-soft)" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  <p className="text-muted mt-0.5 text-xs font-semibold">
                    {s.state === 'out' ? t('ops.supplyOutHint') : t('ops.supplyLowHint')}
                  </p>
                </div>
                <Chip tone={s.state === 'out' ? 'danger' : 'warning'}>
                  {s.state === 'out' ? t('ops.supplyOut') : t('ops.supplyLow')}
                </Chip>
                <span className="shrink-0" aria-hidden style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }} />
              </Card>
            ))}
            {data.maintenanceDue.map((m) => (
              <Card key={m.assetId} className="lift-hover flex items-center gap-3 px-3 py-2.5">
                <GlyphTile glyph="wrench" wash="var(--chorify-primary-soft)" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{m.assetName}</p>
                  <p className="text-muted mt-0.5 text-xs font-semibold">{t('ops.maintenanceHint')}</p>
                </div>
                <Chip tone="info">{formatDate(m.nextDue)}</Chip>
              </Card>
            ))}
          </div>
        </section>
      )}

      {data.upcoming.length > 0 && (
        <section aria-label={t('today.comingUp')} className="mt-6">
          <h2 className="font-display text-xl">{t('today.comingUp')}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {data.upcoming.map((o, index) => (
              <TaskUpcomingRow
                key={o.id}
                className="stagger-item"
                style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
                title={o.title}
                meta={formatDate(o.dueDate)}
                glyph={storedIconGlyph(o.icon, o.title)}
                crayonIndex={index + 1}
                people={assigneePeople(o)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
