'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, ChoreCheck, EmptyState, SectionWatermark, Skeleton, SwipeCard, TaskCard, storedIconGlyph } from '@/components/ui';
import { useOccurrenceAct, useOccurrences, usePeopleMap, type TitledOccurrence } from '@/features/chores';
import { type RootState } from '@/store';
import { formatDate } from '@/lib/dates';

type Tab = 'mine' | 'everyone' | 'overdue';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ChoresPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('everyone');
  const auth = useSelector((state: RootState) => state.auth);
  const activePersonId = auth.activePerson?.id ?? null;
  const act = useOccurrenceAct();

  const from = todayIso();
  const to = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const occurrences = useOccurrences({ from, to });
  const people = usePeopleMap();
  const names = new Map((people.data?.people ?? []).map((p) => [p.id, p.name] as const));
  const emojis = new Map((people.data?.people ?? []).map((p) => [p.id, p.avatarEmoji ?? null] as const));

  if (occurrences.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (occurrences.isError) {
    return (
      <EmptyState art="cloud" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => occurrences.refetch()}>{t('common.retry')}</Button>} />
    );
  }

  const all = occurrences.data.occurrences.filter((o) => o.status === 'pending');
  const overdue = all.filter((o) => o.dueDate < from);
  const visible =
    tab === 'mine'
      ? all.filter((o) => activePersonId !== null && o.personIds.includes(activePersonId))
      : tab === 'overdue'
        ? overdue
        : all;

  const label = (o: TitledOccurrence) =>
    o.personIds.length === 0 ? t('today.upForGrabs') : o.personIds.map((id) => names.get(id) ?? '…').join(', ');

  const peopleOf = (o: TitledOccurrence) =>
    o.personIds.map((id) => {
      const name = names.get(id) ?? '?';
      return { initial: name.trim().charAt(0).toUpperCase() || '?', label: name, emoji: emojis.get(id) ?? null };
    });

  const dueLabelOf = (o: TitledOccurrence) => {
    if (o.dueDate < from) return t('household.missed');
    if (o.dueDate === from) return t('today.today');
    return formatDate(o.dueDate);
  };

  return (
    <div className="page-enter relative">
      <SectionWatermark variant="bubbles" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">{t('chores.title')}</h1>
        <Link href="/chores/new">
          <Button tone="quiet">+ {t('chores.newChore')}</Button>
        </Link>
      </div>
      <div className="mt-3 flex gap-2" role="tablist" aria-label={t('chores.scope')}>
        {(['mine', 'everyone', 'overdue'] as Tab[]).map((tabOption) => (
          <button
            key={tabOption}
            role="tab"
            aria-selected={tab === tabOption}
            onClick={() => setTab(tabOption)}
            className={`tap-spring rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === tabOption ? 'bg-accent-wash text-ink shadow-soft' : 'bg-surface text-ink/70 border-line border'
            }`}
          >
            {/* Label comes from the ITERATED option, not the selection — each
                chip always states its own name (Mine · Everyone · Overdue). */}
            {tabOption === 'mine' ? t('chores.mine') : tabOption === 'everyone' ? t('chores.everyone') : `${t('chores.overdue')}${overdue.length > 0 ? ` · ${overdue.length}` : ''}`}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState art="sparkle" title={t('chores.allClear')} hint={t('chores.allClearHint')} />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((o, index) => (
            <SwipeCard key={o.id} onSwipeRight={() => act.mutate({ id: o.id, action: 'complete' })}>
              <TaskCard
                className="stagger-item"
                style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
                title={o.title}
                meta={label(o)}
                dueLabel={dueLabelOf(o)}
                glyph={storedIconGlyph(o.icon, o.title)}
                overdue={o.dueDate < from}
                crayonIndex={index}
                people={peopleOf(o)}
                href={`/chores/${o.responsibilityId}`}
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
          ))}
        </div>
      )}
    </div>
  );
}
