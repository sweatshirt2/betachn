'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, Field, Skeleton } from '@/components/ui';
import { useCreateRole, useResetRole, useRoles } from '@/features/household';

/** Role editor (§5.5): name-only save, reset-to-default, owner toggle display. */
export default function RolesPage() {
  const { t } = useTranslation();
  const roles = useRoles();
  const create = useCreateRole();
  const reset = useResetRole();
  const [name, setName] = useState('');

  if (roles.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (roles.isError) {
    return (
      <EmptyState art="cloud" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => roles.refetch()}>{t('common.retry')}</Button>} />
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
      <Link href="/household" className="text-terracotta text-sm font-semibold">
        ← {t('household.title')}
      </Link>
      <h1 className="font-display mt-1 text-2xl">{t('household.familyRoles')}</h1>
      <div className="mt-3 flex flex-col gap-2">
        {roles.data.roles.map((r) => (
          <Card key={r.id} className="lift-hover flex items-center gap-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {r.name} {r.isOwnerRole && <span aria-label={t('household.owner')}>●</span>}
              </p>
              <p className="text-muted text-xs">
                {r.isBuiltin ? t('household.builtinPreset') : t('household.customRole')} ·{' '}
                {t('household.permissionsCount', { count: Object.values(r.permissions).filter(Boolean).length })}
              </p>
            </div>
            <Button tone="quiet" disabled={reset.isPending} onClick={() => reset.mutate({ id: r.id })}>
              {t('household.reset')}
            </Button>
          </Card>
        ))}
      </div>
      <p className="text-muted mt-2 text-xs">{t('household.resetExplain')}</p>
      <Card className="mt-4">
        <form onSubmit={onCreate} className="flex gap-2">
          <Field label={t('household.newRole')} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
            {t('common.add')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
