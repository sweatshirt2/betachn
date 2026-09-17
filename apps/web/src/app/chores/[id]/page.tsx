'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Card, ChoreCheck, EmptyState, Sheet, Skeleton } from '@/components/ui';
import { useOccurrenceAct, useOccurrences, useResponsibility, usePeopleMap } from '@/features/chores';
import { ProofSheet } from '@/features/chores/components/ProofSheet';
import type { RootState } from '@/store';

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Chore detail (§5.5): rule readout, occurrence reassign, assign-again. */
export default function ChoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const canReassign = useSelector(
    (state: RootState) => state.auth.permissionMap['responsibilities.reassign'] === true,
  );
  const detail = useResponsibility(id);
  const act = useOccurrenceAct();
  const people = usePeopleMap();
  const occurrences = useOccurrences({});
  const names = new Map((people.data?.people ?? []).map((p) => [p.id, p.name] as const));

  const [reassignFor, setReassignFor] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  /** Required-proof gate (§4A.4): occurrence id awaiting photo completion. */
  const [proofFor, setProofFor] = useState<string | null>(null);

  /** Shared completion entry — routes through the proof sheet when required. */
  const requestComplete = (occurrenceId: string) => {
    if (responsibility?.proofMode === 'required') setProofFor(occurrenceId);
    else act.mutate({ id: occurrenceId, action: 'complete' });
  };

  if (detail.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (detail.isError) {
    return (
      <EmptyState
        art="cloud"
        title={t('chores.notFound')}
        hint={t('chores.notFoundHint')}
        action={
          <Link href="/chores">
            <Button>{t('chores.backToChores')}</Button>
          </Link>
        }
      />
    );
  }

  const { responsibility, subtasks, rules } = detail.data;
  const all = occurrences.data?.occurrences ?? [];
  const related = all.filter((o) => o.responsibilityId === id && o.status === 'pending');

  // History strip (§5.5): newest-first, terminal occurrences only. Filter
  // toggle: all members or this chore's finished rows only (member filter is
  // satisfied by the per-person stats on their sheet).
  const history = all
    .filter((o) => o.responsibilityId === id && o.status !== 'pending')
    .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));

  // Natural-language readout (CN micro-11/32) — same shapes the composer emits.
  const readout = rules
    .map((rule) => {
      const who =
        rule.personIds.length === 0
          ? t('today.upForGrabs')
          : rule.personIds.map((pid) => names.get(pid) ?? '…').join(', ');
      if (rule.rotation && rule.rotation.personIds.length > 1) {
        const roster = rule.rotation.personIds.map((pid) => names.get(pid) ?? '…').join(' ↔ ');
        return `${t('chores.rotationPeriod', { n: rule.rotation.periodDays })} · ${roster}`;
      }
      const everyN = rule.pattern === 'every_n_days' || rule.pattern === 'every_n_weeks';
      const cadence = everyN
        ? rule.pattern === 'every_n_days'
          ? t('chores.intervalDays', { n: rule.interval ?? 1 })
          : t('chores.intervalWeeks', { n: rule.interval ?? 1 })
        : t(`chores.${rule.pattern}`);
      return `${cadence} · ${t('chores.assignedToShort', { who })}`;
    })
    .join(' · ');

  return (
    <div className="page-enter">
      <Link href="/chores" className="text-terracotta text-sm font-semibold">
        {t('chores.title')}
      </Link>
      <div className="bg-card-wash border-line shadow-soft mt-2 flex items-center gap-4 rounded-lg border p-4">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[34%] text-2xl"
          style={{ background: 'var(--chorify-crayon-2)' }}
        >
          {responsibility.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-2xl">{responsibility.title}</h1>
          {readout && <p className="text-muted mt-0.5 truncate text-sm">↻ {readout}</p>}
        </div>
      </div>
      {responsibility.notes && <p className="text-muted mt-2 text-sm">{responsibility.notes}</p>}

      {/* Assign again (CN micro-29): prefill composer with a one-time rule tomorrow. */}
      <div className="mt-3 flex gap-2">
        <Link
          href={`/chores/new?title=${encodeURIComponent(responsibility.title)}&icon=${encodeURIComponent(responsibility.icon)}&pattern=once&start=${addDaysIso(new Date().toISOString().slice(0, 10), 1)}`}
        >
          <Button tone="quiet">{t('chores.assignAgain')}</Button>
        </Link>
      </div>

      {subtasks.length > 0 && (
        <section className="mt-4" aria-label={t('chores.steps')}>
          <h2 className="font-display text-lg">{t('chores.steps')}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {subtasks.map((s) => (
              <Card key={s.id} className="lift-hover flex items-center gap-3.5 py-3">
                <p className="flex-1 text-sm font-semibold">{s.title}</p>
                {s.assigneePersonId && (
                  <span className="text-muted text-xs">{names.get(s.assigneePersonId) ?? '…'}</span>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-4" aria-label={t('chores.history')}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">{t('chores.history')}</h2>
            <button
              type="button"
              className="text-terracotta text-xs font-semibold"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              {historyOpen ? '−' : `+ ${t('chores.historyAll')} (${history.length})`}
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {(historyOpen ? history : history.slice(0, 3)).map((o) => {
              const taker =
                o.status === 'completed' && o.completedByPersonId && !o.personIds.includes(o.completedByPersonId)
                  ? ` · ${t('chores.takenBy', { who: names.get(o.completedByPersonId) ?? '…' })}`
                  : '';
              const label =
                o.status === 'completed'
                  ? t('chores.statusCompleted', { date: o.dueDate })
                  : o.status === 'skipped'
                    ? t('chores.statusSkipped', { date: o.dueDate })
                    : t('chores.statusMissed', { date: o.dueDate });
              return (
                <div key={o.id} className="text-muted flex items-center gap-2 py-0.5 text-sm">
                  <span aria-hidden>{o.status === 'completed' ? '✓' : o.status === 'skipped' ? '⤼' : '✕'}</span>
                  <span className="flex-1 truncate">{label}{taker}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-4" aria-label={t('chores.open')}>
          <h2 className="font-display text-lg">{t('chores.open')}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {related.map((o) => {
              const upForGrabs = o.personIds.length === 0;
              return (
                <Card key={o.id} className="lift-hover flex items-center gap-3.5 py-3">
                  <p className="flex-1 text-sm">
                    {t('chores.due', { date: o.dueDate })} ·{' '}
                    {o.personIds.map((pid) => names.get(pid) ?? '…').join(', ') || t('today.upForGrabs')}
                  </p>
                  {canReassign && !upForGrabs && (
                    <Button tone="quiet" onClick={() => setReassignFor(o.id)}>
                      {t('chores.reassign')}
                    </Button>
                  )}
                  <ChoreCheck
                    done={false}
                    disabled={act.isPending}
                    onClick={() => requestComplete(o.id)}
                    label={t('chores.completeAria', { title: o.title ?? responsibility.title })}
                  />
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <ReassignSheet
        occurrenceId={reassignFor}
        onClose={() => setReassignFor(null)}
        act={act}
        people={(people.data?.people ?? []).map((p) => ({ id: p.id, name: p.name }))}
        titleTemplate={t('chores.reassignTitle')}
        hint={t('chores.reassignHint')}
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
      />
      {proofFor !== null && (
        <ProofSheet
          occurrenceId={proofFor}
          onClose={() => setProofFor(null)}
          onComplete={() => act.mutate({ id: proofFor, action: 'complete' })}
          onCompleted={() => setProofFor(null)}
          isCompleting={act.isPending}
        />
      )}
    </div>
  );
}

/** Occurrence-scoped reassign (§6.3, CN micro-30/31): moves ONE occurrence. */
function ReassignSheet({
  occurrenceId,
  onClose,
  act,
  people,
  titleTemplate,
  hint,
  confirmLabel,
  cancelLabel,
}: {
  occurrenceId: string | null;
  onClose: () => void;
  act: ReturnType<typeof useOccurrenceAct>;
  people: Array<{ id: string; name: string }>;
  titleTemplate: string;
  hint: string;
  confirmLabel: string;
  cancelLabel: string;
}) {
  const { t } = useTranslation();
  const [personIds, setPersonIds] = useState<string[]>([]);

  return (
    <Sheet open={occurrenceId !== null} onClose={onClose} title={titleTemplate}>
      <p className="text-muted text-sm">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() =>
              setPersonIds((current) =>
                current.includes(p.id) ? current.filter((x) => x !== p.id) : [...current, p.id],
              )
            }
            aria-pressed={personIds.includes(p.id)}
            className={`tap-spring rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${personIds.includes(p.id) ? 'border-terracotta bg-accent-wash text-ink shadow-soft' : 'border-line bg-surface text-muted'}`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          disabled={act.isPending || personIds.length === 0}
          onClick={() => {
            if (occurrenceId === null) return;
            act.mutate({ id: occurrenceId, action: 'reassign', personIds });
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
        <Button tone="quiet" onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </Sheet>
  );
}
