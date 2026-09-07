'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Sheet } from '@/components/ui';
import { clearApiCache, queryKeys, useApiQuery } from '@/lib/api';
import { useSyncBoot, useSyncStatus } from '@/lib/sync/syncClient';
import { exitViewAs, type RootState } from '@/store';
import { ProfileSwitcher } from './ProfileSwitcher';

type TabItem = { href: string; key: 'today' | 'chores' | 'household' | 'more' | 'routines' | 'home' | 'supplies' | 'shopping' | 'activity' | 'notifications' | 'settings'; icon: string };

const TABS: TabItem[] = [
  { href: '/', key: 'today', icon: '🏠' },
  { href: '/chores', key: 'chores', icon: '🧺' },
  { href: '/household', key: 'household', icon: '👨‍👩‍👧' },
  { href: '/more', key: 'more', icon: '⋯' },
];

const RAIL: TabItem[] = [
  ...TABS.slice(0, 3),
  { href: '/routines', key: 'routines', icon: '🌅' },
  { href: '/home', key: 'home', icon: '🏡' },
  { href: '/supplies', key: 'supplies', icon: '🧴' },
  { href: '/shopping', key: 'shopping', icon: '🛒' },
  { href: '/activity', key: 'activity', icon: '📜' },
  { href: '/notifications', key: 'notifications', icon: '🔔' },
  { href: '/household', key: 'household', icon: '⚙️' },
  { href: '/settings', key: 'settings', icon: '🔧' },
];

const CHROMELESS = ['/login', '/onboarding'];

/** App shell (§5.1): greeting bar + bottom tabs on mobile, left rail wide. */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [createOpen, setCreateOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const mode = useSelector((state: RootState) => state.auth.mode);
  const hasToken = useSelector((state: RootState) => state.auth.token !== null);
  const activePerson = useSelector((state: RootState) => state.auth.activePerson);
  const viewAsPersonId = useSelector((state: RootState) => state.auth.viewAsPersonId);
  useSyncBoot();
  const sync = useSyncStatus();
  const people = useApiQuery<{ people: Array<{ id: string; name: string }> }>({
    endpoint: { method: 'get', path: '/profiles' },
    key: queryKeys.profiles(),
    options: { enabled: hasToken },
  });
  const viewedName = people.data?.people.find((p) => p.id === viewAsPersonId)?.name;

  if (CHROMELESS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return <>{children}</>;
  }

  return (
    <div className="bg-cream text-ink min-h-screen lg:flex">
      <aside className="border-line bg-surface hidden w-56 shrink-0 flex-col gap-1 border-r p-4 lg:flex" data-no-print>
        <p className="font-display px-2 text-xl">Chorify</p>
        <nav className="mt-2 flex flex-col gap-1" aria-label={t('nav.primary')}>
          {RAIL.map((item) => (
            <Link
              key={`${item.href}-${item.key}`}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${pathname === item.href ? 'bg-cream' : ''}`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <span aria-hidden>{item.icon}</span> {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-cream flex items-center justify-between gap-2 px-4 pt-4">
          <p className="font-display text-2xl">
            {t(greetingKey())}, {activePerson?.name ?? t('nav.family')}
          </p>
          <div className="flex items-center gap-2">
            {mode === 'server' && hasToken && (
              <span className="border-line bg-surface rounded-sm border px-2 py-0.5 text-xs" role="status">
                {t('nav.upToDate')}
              </span>
            )}
            {mode === 'device' && (
              <SyncChip
                pendingCount={sync.pendingCount}
                level={sync.banner.level}
                syncingLabel={t('sync.syncing')}
                freshLabel={t('sync.savedLocal')}
                pendingLabel={t('sync.pending', { count: sync.pendingCount })}
              />
            )}
            {activePerson && (
              <button
                className="bg-surface border-line rounded-md border px-2 py-1 text-sm"
                onClick={() => setProfilesOpen(true)}
                aria-label={t('auth.switchProfileAria', { name: activePerson.name })}
              >
                🙂
              </button>
            )}
          </div>
        </header>

        {viewAsPersonId && (
          <div className="bg-mustard text-ink mx-4 mt-2 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold" role="status">
            <span>{t('nav.previewingAs', { name: viewedName ?? t('nav.family') })}</span>
            <button
              className="underline"
              onClick={() => {
                dispatch(exitViewAs());
                clearApiCache();
              }}
            >
              {t('nav.exit')}
            </button>
          </div>
        )}

        {mode === 'device' && sync.banner.level !== 'fresh' && (
          <div
            className={`text-ink mx-4 mt-2 flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
              sync.banner.level === 'warn' ? 'bg-mustard' : 'bg-clay-red text-cream'
            }`}
            role="status"
          >
            <span>
              {sync.banner.level === 'warn' && t('sync.staleWarn')}
              {sync.banner.level === 'strong' && t('sync.staleStrong')}
              {sync.banner.level === 'resync' && t('sync.staleResync')}
            </span>
            {!hasToken && <span className="hidden text-xs sm:inline">{t('sync.signUpNudge')}</span>}
          </div>
        )}

        <ProfileSwitcher open={profilesOpen} onClose={() => setProfilesOpen(false)} />

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-2 lg:pb-12">{children}</main>

        <button
          className="bg-terracotta text-terracotta-ink fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full text-2xl shadow-lift lg:bottom-8 lg:right-8"
          onClick={() => setCreateOpen(true)}
          aria-label={t('nav.create')}
        >
          +
        </button>

        <nav
          className="border-line bg-surface fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label={t('nav.primary')}
          data-no-print
        >
          {TABS.slice(0, 2).map((item) => (
            <Tab key={item.href} href={item.href} label={t(`nav.${item.key}`)} icon={item.icon} active={pathname === item.href} />
          ))}
          <span className="w-12" aria-hidden />
          {TABS.slice(2).map((item) => (
            <Tab key={item.href} href={item.href} label={t(`nav.${item.key}`)} icon={item.icon} active={pathname === item.href} />
          ))}
        </nav>

        <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title={t('nav.create')}>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setCreateOpen(false)}>🧺 {t('nav.newResponsibility')}</Button>
            <Button tone="quiet" onClick={() => setCreateOpen(false)}>
              🛒 {t('nav.newShoppingItem')}
            </Button>
            <Button tone="quiet" onClick={() => setCreateOpen(false)}>
              🙂 {t('nav.newPerson')}
            </Button>
            <Button tone="quiet" disabled>
              {t('nav.expense')} — {t('nav.soon')}
            </Button>
            <Button tone="quiet" disabled>
              {t('nav.bill')} — {t('nav.soon')}
            </Button>
          </div>
        </Sheet>
      </div>
    </div>
  );
}

function greetingKey(): 'nav.morning' | 'nav.afternoon' | 'nav.evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'nav.morning';
  if (hour < 18) return 'nav.afternoon';
  return 'nav.evening';
}

/** Device-mode sync chip (§4.12): syncing pulse, saved-local check, pending count. */
function SyncChip(props: {
  pendingCount: number;
  level: string;
  syncingLabel: string;
  freshLabel: string;
  pendingLabel: string;
}) {
  const label =
    props.level === 'resync' || props.pendingCount === 0
      ? props.freshLabel
      : props.pendingLabel;
  return (
    <span className="border-line bg-surface rounded-sm border px-2 py-0.5 text-xs" role="status">
      {label}
    </span>
  );
}

function Tab({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold ${active ? 'text-terracotta' : 'text-muted'}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}
