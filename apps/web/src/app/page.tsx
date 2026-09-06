'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Button, Card, Chip, EmptyState, SectionWatermark, Skeleton } from '@/components/ui';
import { useOccurrenceAct, useToday, type TitledOccurrence } from '@/features/chores';
import { queryKeys, useApiQuery } from '@/lib/api';
import type { RootState } from '@/store';

type Person = { id: string; name: string };

function usePeopleMap() {
  const token = useSelector((state: RootState) => state.auth.token);
  const query = useApiQuery<{ people: Person[] }>({
    endpoint: { method: 'get', path: '/profiles' },
    key: queryKeys.profiles(),
    options: { enabled: token !== null },
  });
  return new Map((query.data?.people ?? []).map((p) => [p.id, p.name] as const));
}

export default function TodayPage() {
  const token = useSelector((state: RootState) => state.auth.token);
  const today = useToday();
  const act = useOccurrenceAct();
  const names = usePeopleMap();

  if (!token) {
    return (
      <EmptyState
        emoji="🏠"
        title="Welcome to Chorify"
        hint="Sign in to your household — or set one up in about a minute."
        action={
          <div className="flex gap-2">
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
            <Link href="/onboarding">
              <Button tone="quiet">Set up</Button>
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
        title="Couldn't load Today"
        hint="Check your connection and try again."
        action={<Button onClick={() => today.refetch()}>Retry</Button>}
      />
    );
  }

  const data = today.data;
  const assigneeLabel = (o: TitledOccurrence) => {
    if (o.personIds.length === 0) return 'Up for grabs';
    return o.personIds.map((id) => names.get(id) ?? '…').join(', ');
  };

  return (
    <div className="relative">
      <SectionWatermark variant="leaves" />
      <section aria-label="Today">
        <h2 className="font-display text-xl">Today</h2>
        {data.todayOccurrences.length === 0 ? (
          <p className="text-muted mt-2 text-sm">Nothing due — enjoy the quiet. You can change this later.</p>
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
                  aria-label={`Complete ${o.title}`}
                >
                  ✓
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {data.missedInGrace.length > 0 && (
        <section aria-label="Missed recently" className="mt-6">
          <p className="text-muted text-sm">
            Missed recently · <span className="text-clay-red font-bold">{data.missedInGrace.length}</span>
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
                  aria-label={`Complete ${o.title}`}
                >
                  ✓
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {(data.lowSupplies.length > 0 || data.maintenanceDue.length > 0) && (
        <section aria-label="Attention" className="mt-6">
          <h2 className="font-display text-xl">Attention</h2>
          <div className="mt-2 flex flex-col gap-2">
            {data.lowSupplies.map((s) => (
              <Card key={s.id} className="flex items-center gap-3 py-2">
                <p className="flex-1 text-sm font-semibold">{s.name}</p>
                <Chip tone="warning">{s.state === 'out' ? 'Out' : 'Running low'}</Chip>
              </Card>
            ))}
            {data.maintenanceDue.map((m) => (
              <Card key={m.assetId} className="flex items-center gap-3 py-2">
                <p className="flex-1 text-sm font-semibold">{m.assetName}</p>
                <Chip tone="info">Due {m.nextDue}</Chip>
              </Card>
            ))}
          </div>
        </section>
      )}

      {data.upcoming.length > 0 && (
        <section aria-label="Coming up" className="mt-6">
          <h2 className="font-display text-xl">Coming up</h2>
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
        {data.completedThisWeek} responsibilities completed this week.
      </p>
    </div>
  );
}
