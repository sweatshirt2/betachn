'use client';

import Link from 'next/link';
import { use } from 'react';
import { useSelector } from 'react-redux';
import { Button, Card, Chip, EmptyState, Skeleton } from '@/components/ui';
import { useOccurrenceAct, useOccurrences, useResponsibility } from '@/features/chores';
import { queryKeys, useApiQuery } from '@/lib/api';
import type { RootState } from '@/store';

type Person = { id: string; name: string };

export default function ChoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const token = useSelector((state: RootState) => state.auth.token);
  const detail = useResponsibility(id);
  const act = useOccurrenceAct();
  const people = useApiQuery<{ people: Person[] }>({
    endpoint: { method: 'get', path: '/profiles' },
    key: queryKeys.profiles(),
    options: { enabled: token !== null },
  });
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
        title="Chore not found"
        hint="It may have been archived."
        action={
          <Link href="/chores">
            <Button>Back to chores</Button>
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
    <div>
      <Link href="/chores" className="text-terracotta text-sm font-semibold">
        ← Chores
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
        <section className="mt-4" aria-label="Subtasks">
          <h2 className="font-display text-lg">Steps</h2>
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
        <section className="mt-4" aria-label="Open occurrences">
          <h2 className="font-display text-lg">Open</h2>
          <div className="mt-2 flex flex-col gap-2">
            {related.map((o) => (
              <Card key={o.id} className="flex items-center gap-3 py-2">
                <p className="flex-1 text-sm">
                  Due {o.dueDate} · {(o.personIds.map((pid) => names.get(pid) ?? '…').join(', ') || 'Up for grabs')}
                </p>
                <Button tone="quiet" disabled={act.isPending} onClick={() => act.mutate({ id: o.id, action: 'complete' })} aria-label="Complete">
                  ✓
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
