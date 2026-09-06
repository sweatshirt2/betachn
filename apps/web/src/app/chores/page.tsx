'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Card, Chip, EmptyState, SectionWatermark, Skeleton } from '@/components/ui';
import { useOccurrenceAct, useOccurrences, type TitledOccurrence } from '@/features/chores';
import { queryKeys, useApiQuery } from '@/lib/api';
import type { RootState } from '@/store';

type Person = { id: string; name: string };
type Tab = 'mine' | 'everyone' | 'overdue';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ChoresPage() {
  const [tab, setTab] = useState<Tab>('everyone');
  const activePersonId = useSelector((state: RootState) => state.auth.activePerson?.id ?? null);
  const token = useSelector((state: RootState) => state.auth.token);
  const act = useOccurrenceAct();

  const from = todayIso();
  const to = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const occurrences = useOccurrences({ from, to });
  const people = useApiQuery<{ people: Person[] }>({
    endpoint: { method: 'get', path: '/profiles' },
    key: queryKeys.profiles(),
    options: { enabled: token !== null },
  });
  const names = new Map((people.data?.people ?? []).map((p) => [p.id, p.name] as const));

  if (!token) {
    return (
      <EmptyState
        emoji="🧺"
        title="Sign in to see chores"
        hint="Your household's responsibilities live here."
        action={
          <Link href="/login">
            <Button>Sign in</Button>
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
      <EmptyState emoji="😕" title="Couldn't load chores" hint="Check your connection and try again." action={<Button onClick={() => occurrences.refetch()}>Retry</Button>} />
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
    o.personIds.length === 0 ? 'Up for grabs' : o.personIds.map((id) => names.get(id) ?? '…').join(', ');

  return (
    <div className="relative">
      <SectionWatermark variant="bubbles" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Chores</h1>
        <Link href="/chores/new">
          <Button tone="quiet">+ New</Button>
        </Link>
      </div>
      <div className="mt-3 flex gap-2" role="tablist" aria-label="Chore scope">
        {(['mine', 'everyone', 'overdue'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-sm px-3 py-1 text-sm font-semibold ${tab === t ? 'bg-terracotta text-terracotta-ink' : 'bg-surface text-ink border-line border'}`}
          >
            {t === 'mine' ? 'Mine' : t === 'everyone' ? 'Everyone' : `Overdue${overdue.length > 0 ? ` · ${overdue.length}` : ''}`}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState emoji="✨" title="All clear" hint="Nothing here — enjoy it while it lasts." />
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {visible.map((o) => (
            <Card key={o.id} className="flex items-center gap-3 py-2">
              <Link href={`/chores/${o.responsibilityId}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{o.title}</p>
                <p className="text-muted text-xs">
                  {o.dueDate} · {label(o)}
                </p>
              </Link>
              {o.status === 'pending' && o.dueDate < from && <Chip tone="danger">Missed</Chip>}
              <Button tone="quiet" disabled={act.isPending} onClick={() => act.mutate({ id: o.id, action: 'complete' })} aria-label={`Complete ${o.title}`}>
                ✓
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
