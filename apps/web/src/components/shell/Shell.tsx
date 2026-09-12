'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Sheet } from '@/components/ui';
import { NavIcon, type NavIconName } from '@/components/icons';
import { clearApiCache, queryKeys, useApiQuery } from '@/lib/api';
import { useSyncBoot, useSyncStatus } from '@/lib/sync/syncClient';
import { exitViewAs, hasSession, type RootState } from '@/store';
import { deviceNotifications } from '@/lib/device/reads';
import { readPasscodeGateState } from '@/lib/device/passcodeGate';
import { LockScreen } from './LockScreen';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ProfileChip } from './ProfileChip';
import { ProfileSwitcher } from './ProfileSwitcher';

type TabKey =
  | 'today'
  | 'duties'
  | 'pantry'
  | 'family'
  | 'routines'
  | 'home'
  | 'activity'
  | 'notifications'
  | 'settings';

type TabItem = { href: string; key: TabKey; icon: NavIconName };

/** Five destinations per the §5.5 nav spec: Home, Tasks, Pantry, Family, Settings. */
const TABS: TabItem[] = [
  { href: '/', key: 'today', icon: 'today' },
  { href: '/chores', key: 'duties', icon: 'chores' },
  { href: '/pantry', key: 'pantry', icon: 'supplies' },
  { href: '/family', key: 'family', icon: 'household' },
  { href: '/settings', key: 'settings', icon: 'settings' },
];

/** Wide-screen rail: the five tabs plus the management pages. */
const RAIL: TabItem[] = [
  ...TABS.slice(0, 3),
  { href: '/routines', key: 'routines', icon: 'routines' },
  { href: '/home', key: 'home', icon: 'home' },
  { href: '/activity', key: 'activity', icon: 'activity' },
  { href: '/notifications', key: 'notifications', icon: 'notifications' },
  ...TABS.slice(3),
];

const CHROMELESS = ['/login', '/onboarding', '/auth'];

/** sessionStorage marker that the app-entry gate was satisfied this tab session. */
const ENTRY_KEY = 'chorify-entry-ok';

/** App shell (§5.5): profile chip + language header, 5-tab bottom nav on mobile, left rail wide. */
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
  // Device passcode gate (D63): while a gate exists and the entry secret isn't
  // in sessionStorage, the shell renders the LockScreen INSTEAD of the app —
  // queries inside children stay unmounted, so nothing leaks.
  const [gateState, setGateState] = useState<'checking' | 'locked' | 'open'>('checking');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (sessionStorage.getItem(ENTRY_KEY) === '1') {
          if (!cancelled) setGateState('open');
          return;
        }
        const state = await readPasscodeGateState();
        if (!cancelled) setGateState(state.status === 'gate' ? 'locked' : 'open');
      } catch {
        if (!cancelled) setGateState('open'); // fail-open: never brick the app
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useSyncBoot();
  const sync = useSyncStatus();
  const people = useApiQuery<{ people: Array<{ id: string; name: string }> }>({
    endpoint: { method: 'get', path: '/profiles' },
    key: queryKeys.profiles(),
    options: { enabled: hasToken },
  });
  const viewedName = people.data?.people.find((p) => p.id === viewAsPersonId)?.name;
  // Unread notification dot rides the header bell (micro-24 companion); the
  // poll is handled by the global sync tick, enabled only with a session.
  const notifications = useApiQuery<{ notifications: Array<{ readAt: string | null }> }>({
    endpoint: { method: 'get', path: '/notifications' },
    key: ['notifications', 'all'] as const,
    options: {
      enabled: hasToken || mode === 'device',
      queryFn:
        mode === 'device'
          ? () => deviceNotifications(false) as Promise<{ notifications: Array<{ readAt: string | null }> }>
          : undefined,
    },
  });
  const unreadCount = (notifications.data?.notifications ?? []).filter((n) => n.readAt === null).length;
  useSelector(hasSession);

  const chromeless = CHROMELESS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (chromeless) {
    return <>{children}</>;
  }
  if (gateState === 'checking') {
    return <div className="bg-page-wash min-h-screen" aria-busy="true" />;
  }
  if (gateState === 'locked') {
    return (
      <LockScreen
        onUnlocked={() => {
          try {
            sessionStorage.setItem(ENTRY_KEY, '1');
          } catch {
            // private-mode — gate re-asks per navigation, acceptable
          }
          setGateState('open');
        }}
      />
    );
  }

  return (
    <div className="ambient bg-page-wash text-ink min-h-screen lg:flex">
      <aside
        className="border-line/70 bg-surface/80 hidden w-56 shrink-0 flex-col gap-1 border-r p-4 backdrop-blur-sm lg:flex"
        data-no-print
      >
        <p className="font-display px-2 text-xl">Chorify</p>
        <nav className="mt-2 flex flex-col gap-1" aria-label={t('nav.primary')}>
          {RAIL.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.key}`}
                href={item.href}
                className={`tap-spring flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-accent-wash text-ink shadow-soft' : 'text-muted hover:bg-surface-alt'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <NavIcon name={item.icon} variant={active ? 'filled' : 'outline'} className="h-5 w-5" />
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 px-4 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            {activePerson && <ProfileChip onOpen={() => setProfilesOpen(true)} />}
            <p className="font-display hidden text-xl sm:block sm:text-2xl">
              {t(greetingKey())}, {activePerson?.name ?? t('nav.family')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {mode === 'server' && hasToken && (
              <span
                className="border-line bg-surface/80 shadow-soft hidden rounded-full border px-2.5 py-0.5 text-xs md:block"
                role="status"
              >
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
            <LanguageSwitcher />
            <Link
              href="/notifications"
              className="border-line bg-surface/80 shadow-soft tap-spring relative flex h-9 w-9 items-center justify-center rounded-full border"
              aria-label={t('nav.notifications')}
            >
              <NavIcon
                name="notifications"
                variant={unreadCount > 0 ? 'filled' : 'outline'}
                className="text-ink h-5 w-5"
                aria-hidden
              />
              {unreadCount > 0 && (
                <span className="bg-clay-red absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" aria-hidden />
              )}
            </Link>
          </div>
        </header>

        {viewAsPersonId && (
          <div
            className="bg-accent-wash text-ink mx-4 mt-2 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold"
            role="status"
          >
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

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-2 sm:px-6 lg:pb-12 xl:max-w-4xl">{children}</main>

        <button
          className="bg-fab text-fab-ink tap-spring outline-surface shadow-lift hover:shadow-glow fixed bottom-[4.5rem] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-2xl outline-4 transition-all duration-200 hover:scale-105 sm:right-6 lg:bottom-8 lg:right-8"
          onClick={() => setCreateOpen(true)}
          aria-label={t('nav.create')}
        >
          +
        </button>

        <nav
          className="border-line/70 bg-surface/90 fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
          aria-label={t('nav.primary')}
          data-no-print
        >
          {TABS.map((item) => (
            <Tab
              key={item.href}
              href={item.href}
              label={t(`nav.${item.key}`)}
              icon={item.icon}
              active={pathname === item.href}
            />
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
    props.level === 'resync' || props.pendingCount === 0 ? props.freshLabel : props.pendingLabel;
  return (
    <span
      className="border-line bg-surface/80 shadow-soft hidden rounded-full border px-2.5 py-0.5 text-xs md:block"
      role="status"
    >
      {label}
    </span>
  );
}

function Tab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: NavIconName;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`tap-spring relative flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-[10px] font-semibold leading-tight transition-colors ${
        active ? 'text-ink' : 'text-muted'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <NavIcon name={icon} variant={active ? 'filled' : 'outline'} className="h-6 w-6" aria-hidden />
      {label}
    </Link>
  );
}
