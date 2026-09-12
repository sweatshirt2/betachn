'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  Button,
  Card,
  EmptyState,
  PersonAvatar,
  SectionWatermark,
  Skeleton,
  TaskActionRow,
  TaskDoneRow,
  crayon,
} from '@/components/ui';
import { NavIcon } from '@/components/icons';
import { useOccurrences, usePeopleMap, type TitledOccurrence } from '@/features/chores';
import { usePeople, useRoles } from '@/features/household';
import { hasSession, type RootState } from '@/store';
import { usePermission } from '@/lib/permissions';
import { formatDate } from '@/lib/dates';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Family (§5.5 nav spec): one composed card per member — avatar, role and
 * today's duties; done and missed counts as a facts-only strip. Privileged
 * viewers can filter across members; everyone else sees only themselves.
 */
export default function FamilyPage() {
  const { t } = useTranslation();
  const auth = useSelector((state: RootState) => state.auth);
  const activePersonId = auth.activePerson?.id ?? null;
  const people = usePeople();
  const roles = useRoles();
  const names = usePeopleMap();
  const canSeeAll = usePermission('household.view_people');
  const [filter, setFilter] = useState<'all' | 'mine'>('mine');

  const from = todayIso();
  const to = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const occurrences = useOccurrences({ from, to });

  if (!hasSession(auth)) {
    return (
      <EmptyState
        emoji="👨‍👩‍👧"
        title={t('family.title')}
        hint={t('auth.signInSubtitle')}
        action={
          <Link href="/login">
            <Button>{t('auth.signIn')}</Button>
          </Link>
        }
      />
    );
  }
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
        emoji="😕"
        title={t('common.loadError')}
        hint={t('common.checkConnection')}
        action={<Button onClick={() => { people.refetch(); occurrences.refetch(); }}>{t('common.retry')}</Button>}
      />
    );
  }

  const all = occurrences.data.occurrences;
  const mine = activePersonId ? all.filter((o) => o.personIds.includes(activePersonId)) : [];
  const effective = canSeeAll && filter === 'all';

  const members = effective
    ? (people.data.people ?? [])
    : (people.data.people ?? []).filter((p) => p.id === activePersonId);

  const bucket = (list: TitledOccurrence[], personId: string) => ({
    today: list.filter(
      (o) => o.personIds.includes(personId) && o.status === 'pending' && o.dueDate <= from,
    ),
    done: list.filter((o) => o.status === 'completed' && o.completedByPersonId === personId && o.dueDate >= weekStartIso()),
    missed: list.filter((o) => o.status === 'missed' && o.personIds.includes(personId) && o.dueDate >= weekStartIso()),
  });

  const showAll = canSeeAll && filter === 'all';
  const list = showAll ? all : all.filter((o) => activePersonId !== null && o.personIds.includes(activePersonId));

  return (
    <div className="page-enter relative">
      <SectionWatermark variant="house" />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl">{t('family.title')}</h1>
          <p className="text-muted mt-0.5 text-sm">{t('family.subtitle')}</p>
        </div>
        {canSeeAll && (
          <div className="border-line bg-surface/80 shadow-soft flex shrink-0 rounded-full border p-0.5" role="tablist" aria-label={t('family.filterAll')}>
            {(['mine', 'all'] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`tap-spring rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  filter === f ? 'bg-accent-wash text-ink shadow-soft' : 'text-muted'
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
          const nameMap = new Map((names.data?.people ?? []).map((n) => [n.id, n.name] as const));
          return (
            <Card key={p.id} className="lift-hover">
              {/* Member header: avatar tile + name + role (owner wears the star). */}
              <div className="flex items-center gap-3">
                <PersonAvatar emoji={p.avatarEmoji} index={index} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{p.name}</p>
                  <p className="text-muted mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
                    {role?.isOwnerRole && (
                      <NavIcon name="owner" variant="filled" className="text-accent h-3.5 w-3.5" aria-hidden />
                    )}
                    {role?.name ?? t('household.noRole')}
                  </p>
                </div>
                {canSeeAll && (
                  <Link
                    href="/household"
                    className="text-terracotta text-[11px] font-bold"
                    aria-label={t('family.viewFull')}
                  >
                    {t('family.viewFull')}
                  </Link>
                )}
              </div>

              {/* Facts strip: finished / missed counts only — never ranked. */}
              <div className="border-line/70 bg-surface-alt/70 mt-3 grid grid-cols-3 rounded-md border px-3 py-2">
                <div className="text-center">
                  <p className="font-display text-lg leading-tight">{b.today.length}</p>
                  <p className="text-muted text-[10px] font-semibold">{t('family.today')}</p>
                </div>
                <div className="border-line/70 text-center">
                  <p className="font-display text-lg leading-tight">{b.done.length}</p>
                  <p className="text-muted text-[10px] font-semibold">{t('family.done')}</p>
                </div>
                <div className="border-line/70 text-center">
                  <p className="font-display text-lg leading-tight">{b.missed.length}</p>
                  <p className="text-muted text-[10px] font-semibold">{t('family.missed')}</p>
                </div>
              </div>

              {/* Today stream: actionable rows with crayon edges. */}
              <div className="mt-3 flex flex-col gap-2">
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
                  <p className="text-muted text-[11px] font-semibold">+{b.today.length - 3} {t('family.today')}</p>
                )}
                {b.today.length === 0 && (
                  <p className="text-muted text-xs">{t('family.emptyToday')}</p>
                )}
              </div>

              {/* Missed strip (facts, subdued). */}              {b.missed.length > 0 && b.missed[0] && (
                <p className="text-muted mt-2 text-[11px] font-semibold">
                  {t('family.missed')}: {b.missed.length} · {formatDate(b.missed[0].dueDate)}
                </p>
              )}
            </Card>
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
