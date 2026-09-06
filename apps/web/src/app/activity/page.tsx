'use client';

import { useState } from 'react';
import { Button, Card, EmptyState, Field, Skeleton } from '@/components/ui';
import { useActivity } from '@/features/activity';

function describe(type: string, params: Record<string, unknown>): string {
  const title = typeof params.title === 'string' ? params.title : null;
  const name = typeof params.personName === 'string' ? params.personName : typeof params.name === 'string' ? params.name : null;
  switch (type) {
    case 'occurrence.completed':
      return `${title ?? 'Chore'} completed.`;
    case 'occurrence.missed':
      return `${title ?? 'Chore'} was missed.`;
    case 'occurrence.skipped':
      return `${title ?? 'Chore'} skipped.`;
    case 'person.added':
      return `${name ?? 'Someone'} joined the household.`;
    case 'responsibility.created':
      return `${title ?? 'Chore'} added.`;
    case 'shopping_item.purchased':
      return `${title ?? name ?? 'Item'} bought.`;
    default:
      return title ?? name ?? type;
  }
}

export default function ActivityPage() {
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
      <EmptyState emoji="😕" title="Couldn't load activity" hint="Check your connection and try again." action={<Button onClick={() => feed.refetch()}>Retry</Button>} />
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl">Activity</h1>
      <div className="mt-2 max-w-xs">
        <Field label="Filter by member id (optional)" value={member} onChange={(e) => setMember(e.target.value)} placeholder="Paste a member id" />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {feed.data.events.map((e) => (
          <Card key={e.id} className="py-2">
            <p className="text-sm">{describe(e.type, e.payload)}</p>
            <p className="text-muted text-xs">{new Date(e.createdAt).toLocaleString()}</p>
          </Card>
        ))}
        {feed.data.events.length === 0 && (
          <EmptyState emoji="📜" title="Quiet so far" hint="Household stories will appear here." />
        )}
      </div>
    </div>
  );
}
