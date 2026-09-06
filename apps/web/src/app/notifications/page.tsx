'use client';

import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import {
  useMarkRead,
  useNotificationPrefs,
  useNotifications,
  useReadAll,
  useSavePrefs,
} from '@/features/notifications';

function describe(type: string, params: Record<string, unknown>): string {
  const count = typeof params.count === 'number' ? params.count : null;
  const title = typeof params.title === 'string' ? params.title : null;
  const name = typeof params.householdName === 'string' ? params.householdName : null;
  switch (type) {
    case 'notify.reminder.digest':
      return `${count ?? ''} due today — tap to open chores.`.trim();
    case 'notify.completion.recorded':
      return `${title ?? 'Chore'} completed.`;
    case 'notify.missed.detected':
      return `${title ?? 'Chore'} was missed.`;
    case 'notify.backup.nudge':
      return `Back up ${name ?? 'your household'} — save a copy.`;
    default:
      return title ?? type;
  }
}

export default function NotificationsPage() {
  const inbox = useNotifications();
  const markRead = useMarkRead();
  const readAll = useReadAll();
  const prefs = useNotificationPrefs();
  const savePrefs = useSavePrefs();

  if (inbox.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-14" />
      </div>
    );
  }
  if (inbox.isError) {
    return (
      <EmptyState emoji="😕" title="Couldn't load notifications" hint="Check your connection and try again." action={<Button onClick={() => inbox.refetch()}>Retry</Button>} />
    );
  }

  const categories = prefs.data?.preferences.categories ?? {};

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Notifications</h1>
        {inbox.data.notifications.some((n) => n.readAt === null) && (
          <Button tone="quiet" disabled={readAll.isPending} onClick={() => readAll.mutate({})}>
            Read all
          </Button>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {inbox.data.notifications.map((n) => (
          <Card key={n.id} className={n.readAt === null ? '' : 'opacity-70'}>
            <button
              className="w-full text-left"
              onClick={() => {
                if (n.readAt === null) markRead.mutate({ id: n.id });
              }}
            >
              <p className="text-sm font-semibold">{describe(n.type, n.paramsJson)}</p>
              <p className="text-muted text-xs">{n.category}</p>
            </button>
          </Card>
        ))}
        {inbox.data.notifications.length === 0 && (
          <EmptyState emoji="🔔" title="All caught up" hint="Reminders and updates land here." />
        )}
      </div>
      {Object.keys(categories).length > 0 && (
        <section className="mt-5" aria-label="Preferences">
          <h2 className="font-display text-lg">What to receive</h2>
          <div className="mt-2 flex flex-col gap-2">
            {Object.entries(categories).map(([category, on]) => (
              <Card key={category} className="flex items-center gap-3 py-2">
                <p className="flex-1 text-sm font-semibold capitalize">{category}</p>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label={`${category} notifications`}
                  onClick={() => savePrefs.mutate({ categories: { ...categories, [category]: !on } })}
                  className={`rounded-sm px-3 py-1 text-sm font-bold ${on ? 'bg-olive text-terracotta-ink' : 'bg-cream text-muted border-line border'}`}
                >
                  {on ? 'On' : 'Off'}
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
