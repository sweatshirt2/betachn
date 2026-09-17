'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Button, Card, EmptyState, Field, Skeleton } from '@/components/ui';
import { useActivity } from '@/features/activity';

function describe(t: TFunction, type: string, params: Record<string, unknown>): string {
  const title = typeof params.title === 'string' ? params.title : t('chores.title');
  const name = typeof params.personName === 'string' ? params.personName : typeof params.name === 'string' ? params.name : t('nav.family');
  switch (type) {
    case 'occurrence.completed':
      return t('activity.occurrenceCompleted', { title });
    case 'occurrence.missed':
      return t('activity.occurrenceMissed', { title });
    case 'occurrence.skipped':
      return t('activity.occurrenceSkipped', { title });
    case 'person.added':
      return t('activity.personAdded', { name });
    case 'responsibility.created':
      return t('activity.responsibilityCreated', { title });
    case 'shopping_item.purchased':
      return t('activity.itemPurchased', { title: typeof params.title === 'string' ? params.title : name });
    case 'reminder.created':
      return t('activity.reminderCreated', { name });
    case 'reminder.paused':
      return t('activity.reminderPaused', { name });
    case 'reminder.archived':
      return t('activity.reminderArchived', { name });
    default:
      return title ?? name;
  }
}

export default function ActivityPage() {
  const { t } = useTranslation();
  const [member, setMember] = useState('');
  const feed = useActivity(member === '' ? {} : { member });

  if (feed.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }
  if (feed.isError) {
    return (
      <EmptyState art="cloud" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => feed.refetch()}>{t('common.retry')}</Button>} />
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl">{t('activity.title')}</h1>
      <div className="mt-2 max-w-xs">
        <Field label={t('activity.filterLabel')} value={member} onChange={(e) => setMember(e.target.value)} placeholder="Paste a member id" />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {feed.data.events.map((e) => (
          <Card key={e.id} className="py-2">
            <p className="text-sm">{describe(t, e.type, e.payload)}</p>
            <p className="text-muted text-xs">{new Date(e.createdAt).toLocaleString()}</p>
          </Card>
        ))}
        {feed.data.events.length === 0 && (
          <EmptyState art="scroll" title={t('activity.quiet')} hint={t('activity.quietHint')} />
        )}
      </div>
    </div>
  );
}
