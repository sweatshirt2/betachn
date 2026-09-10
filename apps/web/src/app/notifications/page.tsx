'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import type { TFunction } from 'i18next';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import {
  useMarkRead,
  useNotificationPrefs,
  useNotifications,
  useReadAll,
  useSavePrefs,
} from '@/features/notifications';

const CATEGORY_KEYS = {
  assignment: 'notify.catAssignment',
  reminder: 'notify.catReminder',
  completion: 'notify.catCompletion',
  missed: 'notify.catMissed',
  finance: 'notify.catFinance',
  bill: 'notify.catBill',
  backup: 'notify.catBackup',
} as const;

function describe(t: TFunction, type: string, params: Record<string, unknown>): string {
  const count = typeof params.count === 'number' ? params.count : null;
  const title = typeof params.title === 'string' ? params.title : t('chores.title');
  const name = typeof params.householdName === 'string' ? params.householdName : t('common.appName');
  switch (type) {
    case 'notify.reminder.digest':
      return t('notify.reminderDigest', { count: count ?? 0 });
    case 'notify.completion.recorded':
      return t('notify.completionRecorded', { title });
    case 'notify.missed.detected':
      return t('notify.missedDetected', { title });
    case 'notify.backup.nudge':
      return t('notify.backupNudge', { name });
    default:
      return title;
  }
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const inbox = useNotifications();
  const markRead = useMarkRead();
  const router = useRouter();
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
      <EmptyState emoji="😕" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => inbox.refetch()}>{t('common.retry')}</Button>} />
    );
  }

  const categories = prefs.data?.preferences.categories ?? {};

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">{t('notify.title')}</h1>
        {inbox.data.notifications.some((n) => n.readAt === null) && (
          <Button tone="quiet" disabled={readAll.isPending} onClick={() => readAll.mutate({})}>
            {t('notify.readAll')}
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
                // Deep-link (micro-24): server events persist a route, never prose.
                if (n.linkPath) router.push(n.linkPath);
              }}
            >
              <p className="text-sm font-semibold">{describe(t, n.type, n.paramsJson)}</p>
              <p className="text-muted text-xs">{t(CATEGORY_KEYS[n.category as keyof typeof CATEGORY_KEYS] ?? 'notify.title')}</p>
            </button>
          </Card>
        ))}
        {inbox.data.notifications.length === 0 && (
          <EmptyState emoji="🔔" title={t('notify.caughtUp')} hint={t('notify.caughtUpHint')} />
        )}
      </div>
      {Object.keys(categories).length > 0 && (
        <section className="mt-5" aria-label={t('notify.prefsAria')}>
          <h2 className="font-display text-lg">{t('notify.whatToReceive')}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {Object.entries(categories).map(([category, on]) => (
              <Card key={category} className="flex items-center gap-3 py-2">
                <p className="flex-1 text-sm font-semibold">{t(CATEGORY_KEYS[category as keyof typeof CATEGORY_KEYS] ?? 'notify.title')}</p>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label={t('notify.categoryAria', { category: t(CATEGORY_KEYS[category as keyof typeof CATEGORY_KEYS] ?? 'notify.title') })}
                  onClick={() => savePrefs.mutate({ categories: { ...categories, [category]: !on } })}
                  className={`rounded-sm px-3 py-1 text-sm font-bold ${on ? 'bg-olive text-terracotta-ink' : 'bg-cream text-muted border-line border'}`}
                >
                  {on ? t('notify.on') : t('notify.off')}
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
