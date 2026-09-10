'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, ChoreCheck, EmptyState, SectionWatermark, Skeleton, SwipeCard } from '@/components/ui';
import { useOccurrenceAct, useOccurrences, usePeopleMap, type TitledOccurrence } from '@/features/chores';
import { hasSession, type RootState } from '@/store';

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

  if (!hasSession(auth)) {
    return (
      <EmptyState
        emoji="🧺"
        title={t('chores.title')}
        hint={t('today.empty')}
        action={
          <Link href="/login">
            <Button>{t('auth.signIn')}</Button>
          </Link>
        }
      />
    );
  }

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
      <EmptyState emoji="😕" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => occurrences.refetch()}>{t('common.retry')}</Button>} />
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
            className={`rounded-sm px-3 py-1 text-sm font-semibold ${tab === tabOption ? 'bg-terracotta text-terracotta-ink' : 'bg-surface text-ink border-line border'}`}
          >
            {tab === 'mine' ? t('chores.mine') : tab === 'everyone' ? t('chores.everyone') : `${t('chores.overdue')}${overdue.length > 0 ? ` · ${overdue.length}` : ''}`}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState emoji="✨" title={t('chores.allClear')} hint={t('chores.allClearHint')} />
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {visible.map((o, index) => (
            <SwipeCard key={o.id} onSwipeRight={() => act.mutate({ id: o.id, action: 'complete' })}>
              <Card className="stagger-item flex items-center gap-3 py-2" style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}>
                <Link href={`/chores/${o.responsibilityId}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{o.title}</p>
                  <p className="text-muted text-xs">
                    {o.dueDate} · {label(o)}
                  </p>
                </Link>
                {o.status === 'pending' && o.dueDate < from && <Chip tone="danger">{t('household.missed')}</Chip>}
                <ChoreCheck
                  done={o.status === 'completed'}
                  disabled={act.isPending}
                  onClick={() => act.mutate({ id: o.id, action: 'complete' })}
                  label={t('chores.completeAria', { title: o.title })}
                />
              </Card>
            </SwipeCard>
          ))}
        </div>
      )}
    </div>
  );
}
