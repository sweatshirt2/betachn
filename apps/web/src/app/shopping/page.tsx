'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, Field, Skeleton } from '@/components/ui';
import { useCreateShoppingItem, usePurchaseItem, useShoppingItems } from '@/features/shopping';

export default function ShoppingPage() {
  const { t } = useTranslation();
  const items = useShoppingItems();
  const create = useCreateShoppingItem();
  const purchase = usePurchaseItem();
  const [name, setName] = useState('');

  if (items.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (items.isError) {
    return (
      <EmptyState emoji="😕" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => items.refetch()}>{t('common.retry')}</Button>} />
    );
  }

  const open = items.data.items.filter((i) => i.purchasedAt === null);
  const done = items.data.items.filter((i) => i.purchasedAt !== null);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length === 0) return;
    await create.mutateAsync({ name: name.trim() });
    setName('');
  }

  return (
    <div>
      <h1 className="font-display text-2xl">{t('ops.shopping')}</h1>
      <div className="mt-3 flex flex-col gap-2">
        {open.map((i) => (
          <Card key={i.id} className="flex items-center gap-3 py-2">
            <p className="flex-1 text-sm font-semibold">{i.name}</p>
            <Button tone="quiet" disabled={purchase.isPending} onClick={() => purchase.mutate({ id: i.id })} aria-label={t('ops.buyAria', { name: i.name })}>
              {t('ops.buy')}
            </Button>
          </Card>
        ))}
      </div>
      {open.length === 0 && (
        <EmptyState emoji="🛒" title={t('ops.listEmpty')} hint={t('ops.shoppingEmptyHint')} />
      )}
      <Card className="mt-3">
        <form onSubmit={onCreate} className="flex gap-2">
          <Field label={t('ops.addItem')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ops.itemPlaceholder')} />
          <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
            {t('common.add')}
          </Button>
        </form>
      </Card>
      {done.length > 0 && (
        <details className="mt-4">
          <summary className="text-muted text-sm font-semibold">{t('ops.bought', { count: done.length })}</summary>
          <div className="mt-2 flex flex-col gap-2 opacity-70">
            {done.map((i) => (
              <Card key={i.id} className="py-2">
                <p className="text-sm">{i.name}</p>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
