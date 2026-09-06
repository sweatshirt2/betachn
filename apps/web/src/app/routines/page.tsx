'use client';

import { useState } from 'react';
import { Button, Card, Chip, EmptyState, Field, Skeleton } from '@/components/ui';
import { useCreateRoutine, useDeleteRoutine, useRoutines } from '@/features/routines';

export default function RoutinesPage() {
  const routines = useRoutines();
  const create = useCreateRoutine();
  const remove = useDeleteRoutine();
  const [name, setName] = useState('');

  if (routines.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (routines.isError) {
    return (
      <EmptyState emoji="😕" title="Couldn't load routines" hint="Check your connection and try again." action={<Button onClick={() => routines.refetch()}>Retry</Button>} />
    );
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length === 0) return;
    await create.mutateAsync({ name: name.trim() });
    setName('');
  }

  return (
    <div>
      <h1 className="font-display text-2xl">Routines</h1>
      <p className="text-muted mt-1 text-sm">Buckets that organize chores — they never schedule anything themselves.</p>
      <div className="mt-3 flex flex-col gap-2">
        {routines.data.routines.map((r) => (
          <Card key={r.id} className="flex items-center gap-3 py-2">
            <span className="text-xl" aria-hidden>
              {r.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="text-muted text-xs">{r.timeBucket}</p>
            </div>
            <Button tone="quiet" disabled={remove.isPending} onClick={() => remove.mutate({ id: r.id })}>
              Remove
            </Button>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <form onSubmit={onCreate} className="flex gap-2">
          <Field label="New routine" value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning" />
          <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
            Add
          </Button>
        </form>
      </Card>
      {routines.data.routines.length > 0 && <Chip>Organizational only</Chip>}
    </div>
  );
}
