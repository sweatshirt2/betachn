'use client';

import { useState } from 'react';
import { Button, Card, Chip, EmptyState, Field, Skeleton } from '@/components/ui';
import { useCreateSupply, useCycleSupply, useSupplies, type SupplyState } from '@/features/supplies';

const NEXT: Record<SupplyState, SupplyState> = { available: 'low', low: 'out', out: 'available' };

export default function SuppliesPage() {
  const supplies = useSupplies();
  const create = useCreateSupply();
  const cycle = useCycleSupply();
  const [name, setName] = useState('');

  if (supplies.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (supplies.isError) {
    return (
      <EmptyState emoji="😕" title="Couldn't load supplies" hint="Check your connection and try again." action={<Button onClick={() => supplies.refetch()}>Retry</Button>} />
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
      <h1 className="font-display text-2xl">Supplies</h1>
      <div className="mt-3 flex flex-col gap-2">
        {supplies.data.supplies.map((s) => (
          <Card key={s.id} className="flex items-center gap-3 py-2">
            <p className="flex-1 text-sm font-semibold">{s.name}</p>
            <Chip tone={s.state === 'available' ? 'success' : s.state === 'low' ? 'warning' : 'danger'}>
              {s.state === 'available' ? 'Available' : s.state === 'low' ? 'Running low' : 'Out'}
            </Chip>
            <Button tone="quiet" disabled={cycle.isPending} onClick={() => cycle.mutate({ id: s.id, state: NEXT[s.state] })} aria-label={`Mark ${s.name} ${NEXT[s.state]}`}>
              →
            </Button>
          </Card>
        ))}
      </div>
      <Card className="mt-3">
        <form onSubmit={onCreate} className="flex gap-2">
          <Field label="New supply" value={name} onChange={(e) => setName(e.target.value)} placeholder="Detergent" />
          <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
}
