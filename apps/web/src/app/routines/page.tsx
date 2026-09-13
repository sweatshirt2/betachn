'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, EmptyState, Field, Skeleton } from '@/components/ui';
import { useCreateRoutine, useDeleteRoutine, useRoutines } from '@/features/routines';

export default function RoutinesPage() {
  const { t } = useTranslation();
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
      <EmptyState art="cloud" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => routines.refetch()}>{t('common.retry')}</Button>} />
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
      <h1 className="font-display text-2xl">{t('ops.routines')}</h1>
      <p className="text-muted mt-1 text-sm">{t('ops.routinesHint')}</p>
      <div className="mt-3 flex flex-col gap-2">
        {routines.data.routines.map((r, index) => (
          <Card key={r.id} className="lift-hover flex items-center gap-3.5 py-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[34%] text-xl"
              style={{ background: `var(--chorify-crayon-${(index % 4) + 1})` }}
            >
              {r.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{r.name}</p>
              <p className="text-muted mt-0.5 text-xs font-semibold">{r.timeBucket}</p>
            </div>
            <Button tone="quiet" disabled={remove.isPending} onClick={() => remove.mutate({ id: r.id })}>
              {t('common.remove')}
            </Button>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <form onSubmit={onCreate} className="flex gap-2">
          <Field label={t('ops.newRoutine')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ops.routinePlaceholder')} />
          <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
            {t('common.add')}
          </Button>
        </form>
      </Card>
      {routines.data.routines.length > 0 && <Chip>{t('ops.organizationalOnly')}</Chip>}
    </div>
  );
}
