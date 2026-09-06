'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, EmptyState, Field, Skeleton } from '@/components/ui';
import { useCreateSupply, useCycleSupply, useSupplies, type SupplyState } from '@/features/supplies';

const NEXT: Record<SupplyState, SupplyState> = { available: 'low', low: 'out', out: 'available' };

export default function SuppliesPage() {
  const { t } = useTranslation();
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
      <EmptyState emoji="😕" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => supplies.refetch()}>{t('common.retry')}</Button>} />
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
      <h1 className="font-display text-2xl">{t('ops.supplies')}</h1>
      <div className="mt-3 flex flex-col gap-2">
        {supplies.data.supplies.map((s) => (
          <Card key={s.id} className="flex items-center gap-3 py-2">
            <p className="flex-1 text-sm font-semibold">{s.name}</p>
            <Chip tone={s.state === 'available' ? 'success' : s.state === 'low' ? 'warning' : 'danger'}>
              {s.state === 'available' ? t('ops.supplyAvailable') : s.state === 'low' ? t('ops.supplyLow') : t('ops.supplyOut')}
            </Chip>
            <Button tone="quiet" disabled={cycle.isPending} onClick={() => cycle.mutate({ id: s.id, state: NEXT[s.state] })} aria-label={t('ops.markAria', { name: s.name, state: NEXT[s.state] })}>
              →
            </Button>
          </Card>
        ))}
      </div>
      <Card className="mt-3">
        <form onSubmit={onCreate} className="flex gap-2">
          <Field label={t('ops.newSupply')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ops.supplyPlaceholder')} />
          <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
            {t('common.add')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
