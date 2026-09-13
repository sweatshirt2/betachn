'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  Button,
  CountStat,
  EmptyState,
  MemberCard,
  SectionWatermark,
  Skeleton,
  TaskActionRow,
  crayon,
} from '@/components/ui';
import { useOccurrences, type TitledOccurrence } from '@/features/chores';
import { roleDisplayName, usePeople, useRoles } from '@/features/household';
import { type RootState } from '@/store';
import { usePermission } from '@/lib/permissions';
import { formatDate } from '@/lib/dates';
import { personFactsTag } from '@/lib/facts';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Family (§5.5 nav spec): one composed card per member — avatar, role,
 * facts tag and today's duties; done and missed counts as a facts-only
 * CountStat strip (never ranked). Privileged viewers can filter across
 * members; everyone else sees only themselves.
 */
export default function FamilyPage() {
  const { t } = useTranslation();
  const auth = useSelector((state: RootState) => state.auth);
  const activePersonId = auth.activePerson?.id ?? null;
  const people = usePeople();
  const roles = useRoles();
  const canSeeAll = usePermission('household.view_people');
  const [filter, setFilter] = useState<'all' | 'mine'>('mine');

  const from = todayIso();
  const to = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const occurrences = useOccurrences({ from, to });

  if (people.isPending || occurrences.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (people.isError || occurrences.isError) {
    return (
      <EmptyState
        art="cloud"
        title={t('common.loadError')}
        hint={t('common.checkConnection')}
        action={
          <Button
            onClick={() => {
              people.refetch();
              occurrences.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const all = occurrences.data.occurrences;

  const bucket = (list: TitledOccurrence[], personId: string) => ({
    today: list.filter(
      (o) => o.personIds.includes(personId) && o.status === 'pending' && o.dueDate <= from,
    ),
    done: list.filter(
      (o) =>
        o.status === 'completed' && o.completedByPersonId === personId && o.dueDate >= weekStartIso(),
    ),
    missed: list.filter(
      (o) => o.status === 'missed' && o.personIds.includes(personId) && o.dueDate >= weekStartIso(),
    ),
  });

  const showAll = canSeeAll && filter === 'all';
  const list = showAll
    ? all
    : all.filter((o) => activePersonId !== null && o.personIds.includes(activePersonId));
  const members = showAll
    ? (people.data.people ?? [])
    : (people.data.people ?? []).filter((p) => p.id === activePersonId);

  return (
    <div className="page-enter relative">
      <SectionWatermark variant="house" />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl">{t('family.title')}</h1>
          <p className="text-muted mt-0.5 text-sm">{t('family.subtitle')}</p>
        </div>
        {canSeeAll && (
          <div
            className="border-line bg-surface/80 shadow-soft flex shrink-0 rounded-full border p-0.5"
            role="tablist"
            aria-label={t('family.filterAll')}
          >
            {(['mine', 'all'] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`tap-spring rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  filter === f ? 'bg-accent-wash text-ink shadow-soft' : 'text-ink/70'
                }`}
              >
                {f === 'mine' ? t('family.filterMine') : t('family.filterAll')}
              </button>
            ))}
          </div>
        )}
      </div>

      {members.length === 0 && <p className="text-muted mt-4 text-sm">{t('family.emptyToday')}</p>}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {members.map((p, index) => {
          const b = bucket(list, p.id);
          const role = roles.data?.roles.find((r) => r.id === p.roleId) ?? null;
          return (
            <MemberCard
              key={p.id}
              index={index}
              emoji={p.avatarEmoji}
              name={p.name}
              owner={role?.isOwnerRole === true}
              role={roleDisplayName(role, t)}
              factsTag={personFactsTag(p, t)}
              interactive={false}
              chevron={false}
              extra={
                <div className="pb-3.5">
                  {/* Facts strip: today / done / missed — facts only, never
                      ranked. CountStat keeps one optical baseline. */}
                  <div className="bg-surface-alt/70 border-line/70 mx-3.5 grid grid-cols-3 divide-x divide-[color:var(--chorify-line)] rounded-md border px-3 py-2.5">
                    <CountStat className="px-1" value={b.today.length} label={t('family.today')} />
                    <CountStat className="px-1" value={b.done.length} label={t('family.done')} />
                    <CountStat className="px-1" value={b.missed.length} label={t('family.missed')} />
                  </div>

                  {/* Today stream: actionable rows with crayon edges. */}
                  <div className="mt-3 flex flex-col gap-2 px-3.5">
                    {b.today.slice(0, 3).map((o, i) => (
                      <TaskActionRow
                        key={o.id}
                        accent={crayon(index + i)}
                        title={o.title}
                        meta={o.dueDate < from ? formatDate(o.dueDate) : undefined}
                        action={
                          <span className="text-muted text-[10px] font-bold" aria-hidden>
                            ›
                          </span>
                        }
                      />
                    ))}
                    {b.today.length > 3 && (
                      <p className="text-muted text-[11px] font-semibold">
                        +{b.today.length - 3} {t('family.today')}
                      </p>
                    )}
                    {b.today.length === 0 && (
                      <p className="text-muted text-xs">{t('family.emptyToday')}</p>
                    )}
                    {b.missed.length > 0 && b.missed[0] && (
                      <p className="text-muted mt-1 text-[11px] font-semibold">
                        {t('family.missed')}: {b.missed.length} · {formatDate(b.missed[0].dueDate)}
                      </p>
                    )}
                  </div>

                  {canSeeAll && (
                    <Link href="/household" className="text-muted px-3.5 pt-3 text-[11px] font-bold hover:underline">
                      {t('family.viewFull')} →
                    </Link>
                  )}
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function weekStartIso(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
