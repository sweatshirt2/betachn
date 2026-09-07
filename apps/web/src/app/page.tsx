'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, EmptyState, SectionWatermark, Skeleton } from '@/components/ui';
import { useOccurrenceAct, useToday, usePeopleMap, type TitledOccurrence } from '@/features/chores';
import { hasSession, type RootState } from '@/store';

export default function TodayPage() {
  const { t } = useTranslation();
  const auth = useSelector((state: RootState) => state.auth);
  const token = auth.token;
  const today = useToday();
  const act = useOccurrenceAct();
  const people = usePeopleMap();
  const names = new Map((people.data?.people ?? []).map((p) => [p.id, p.name] as const));

  if (!hasSession(auth)) {
    return (
      <EmptyState
        emoji="🏠"
        title={t('common.appName')}
        hint={t('auth.signInSubtitle')}
        action={
          <div className="flex gap-2">
            <Link href="/login">
              <Button>{t('auth.signIn')}</Button>
            </Link>
            <Link href="/onboarding">
              <Button tone="quiet">{t('auth.setupHousehold')}</Button>
            </Link>
          </div>
        }
      />
    );
  }

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
        emoji="😕"
        title={t('common.loadError')}
        hint={t('common.checkConnection')}
        action={<Button onClick={() => today.refetch()}>{t('common.retry')}</Button>}
      />
    );
  }

  const data = today.data;
  const assigneeLabel = (o: TitledOccurrence) => {
    if (o.personIds.length === 0) return t('today.upForGrabs');
    return o.personIds.map((id) => names.get(id) ?? '…').join(', ');
  };

  return (
    <div className="relative">
      <SectionWatermark variant="leaves" />
      <section aria-label={t('today.today')}>
        <h2 className="font-display text-xl">{t('today.today')}</h2>
        {data.todayOccurrences.length === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('today.empty')}</p>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            {data.todayOccurrences.map((o) => (
              <Card key={o.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{o.title}</p>
                  <p className="text-muted text-xs">{assigneeLabel(o)}</p>
                </div>
                <Button
                  tone="quiet"
                  disabled={act.isPending}
                  onClick={() => act.mutate({ id: o.id, action: 'complete' })}
                  aria-label={t('chores.completeAria', { title: o.title })}
                >
                  ✓
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {data.missedInGrace.length > 0 && (
        <section aria-label={t('today.missedRecently')} className="mt-6">
          <p className="text-muted text-sm">
            {t('today.missedRecently')} · <span className="text-clay-red font-bold">{data.missedInGrace.length}</span>
          </p>
          <div className="mt-2 flex flex-col gap-2 opacity-80">
            {data.missedInGrace.map((o) => (
              <Card key={o.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{o.title}</p>
                  <p className="text-muted text-xs">{o.dueDate}</p>
                </div>
                <Button
                  tone="quiet"
                  disabled={act.isPending}
                  onClick={() => act.mutate({ id: o.id, action: 'complete' })}
                  aria-label={t('chores.completeAria', { title: o.title })}
                >
                  ✓
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {(data.lowSupplies.length > 0 || data.maintenanceDue.length > 0) && (
        <section aria-label={t('today.attention')} className="mt-6">
          <h2 className="font-display text-xl">{t('today.attention')}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {data.lowSupplies.map((s) => (
              <Card key={s.id} className="flex items-center gap-3 py-2">
                <p className="flex-1 text-sm font-semibold">{s.name}</p>
                <Chip tone="warning">{s.state === 'out' ? t('ops.supplyOut') : t('ops.supplyLow')}</Chip>
              </Card>
            ))}
            {data.maintenanceDue.map((m) => (
              <Card key={m.assetId} className="flex items-center gap-3 py-2">
                <p className="flex-1 text-sm font-semibold">{m.assetName}</p>
                <Chip tone="info">{t('ops.dueDate', { date: m.nextDue })}</Chip>
              </Card>
            ))}
          </div>
        </section>
      )}

      {data.upcoming.length > 0 && (
        <section aria-label={t('today.comingUp')} className="mt-6">
          <h2 className="font-display text-xl">{t('today.comingUp')}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {data.upcoming.map((o) => (
              <Card key={o.id} className="flex items-center gap-3 py-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{o.title}</p>
                <span className="text-muted text-xs">{o.dueDate}</span>
              </Card>
            ))}
          </div>
        </section>
      )}

      <p className="text-muted mt-6 text-center text-sm">
        {data.completedThisWeek} {t('today.completedWeek')}
      </p>
    </div>
  );
}
