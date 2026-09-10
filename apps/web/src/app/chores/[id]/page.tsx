'use client';

import Link from 'next/link';
import { use } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, ChoreCheck, EmptyState, Skeleton } from '@/components/ui';
import { useOccurrenceAct, useOccurrences, useResponsibility, usePeopleMap } from '@/features/chores';

export default function ChoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const detail = useResponsibility(id);
  const act = useOccurrenceAct();
  const people = usePeopleMap();
  const occurrences = useOccurrences({});
  const names = new Map((people.data?.people ?? []).map((p) => [p.id, p.name] as const));

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
        emoji="😕"
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
  const related = (occurrences.data?.occurrences ?? []).filter(
    (o) => o.responsibilityId === id && o.status === 'pending',
  );

  return (
    <div className="page-enter">
      <Link href="/chores" className="text-terracotta text-sm font-semibold">
        {t('chores.title')}
      </Link>
      <h1 className="font-display mt-1 text-2xl">
        {responsibility.icon} {responsibility.title}
      </h1>
      {responsibility.notes && <p className="text-muted mt-1 text-sm">{responsibility.notes}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {rules.map((rule) => (
          <Chip key={rule.id}>↻ {rule.pattern}</Chip>
        ))}
      </div>

      {subtasks.length > 0 && (
        <section className="mt-4" aria-label={t('chores.steps')}>
          <h2 className="font-display text-lg">{t('chores.steps')}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {subtasks.map((s) => (
              <Card key={s.id} className="flex items-center gap-3 py-2">
                <p className="flex-1 text-sm font-semibold">{s.title}</p>
                {s.assigneePersonId && (
                  <span className="text-muted text-xs">{names.get(s.assigneePersonId) ?? '…'}</span>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-4" aria-label={t('chores.open')}>
          <h2 className="font-display text-lg">{t('chores.open')}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {related.map((o) => (
              <Card key={o.id} className="flex items-center gap-3 py-2">
                <p className="flex-1 text-sm">
                  {t('chores.due', { date: o.dueDate })} · {(o.personIds.map((pid) => names.get(pid) ?? '…').join(', ') || t('today.upForGrabs'))}
                </p>
                <ChoreCheck
                  done={false}
                  disabled={act.isPending}
                  onClick={() => act.mutate({ id: o.id, action: 'complete' })}
                  label={t('chores.completeAria', { title: o.title ?? responsibility.title })}
                />
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
