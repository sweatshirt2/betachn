'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Sheet } from '@/components/ui';
import { clearApiCache, queryKeys, useApiQuery } from '@/lib/api';
import { exitViewAs, type RootState } from '@/store';
import { ProfileSwitcher } from './ProfileSwitcher';

const TABS = [
  { href: '/', label: 'Today', icon: '🏠' },
  { href: '/chores', label: 'Chores', icon: '🧺' },
  { href: '/household', label: 'Household', icon: '👨‍👩‍👧' },
  { href: '/more', label: 'More', icon: '⋯' },
];

const RAIL = [
  ...TABS.slice(0, 3),
  { href: '/routines', label: 'Routines', icon: '🌅' },
  { href: '/home', label: 'Home', icon: '🏡' },
  { href: '/supplies', label: 'Supplies', icon: '🧴' },
  { href: '/shopping', label: 'Shopping', icon: '🛒' },
  { href: '/activity', label: 'Activity', icon: '📜' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/household', label: 'Household setup', icon: '⚙️' },
  { href: '/settings', label: 'Settings', icon: '🔧' },
];

const CHROMELESS = ['/login', '/onboarding'];

/** App shell (§5.1): greeting bar + bottom tabs on mobile, left rail wide. */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [createOpen, setCreateOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const activePerson = useSelector((state: RootState) => state.auth.activePerson);
  const token = useSelector((state: RootState) => state.auth.token);
  const viewAsPersonId = useSelector((state: RootState) => state.auth.viewAsPersonId);
  const people = useApiQuery<{ people: Array<{ id: string; name: string }> }>({
    endpoint: { method: 'get', path: '/profiles' },
    key: queryKeys.profiles(),
    options: { enabled: token !== null },
  });
  const viewedName = people.data?.people.find((p) => p.id === viewAsPersonId)?.name;

  if (CHROMELESS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return <>{children}</>;
  }

  return (
    <div className="bg-cream text-ink min-h-screen lg:flex">
      <aside className="border-line bg-surface hidden w-56 shrink-0 flex-col gap-1 border-r p-4 lg:flex" data-no-print>
        <p className="font-display px-2 text-xl">Chorify</p>
        <nav className="mt-2 flex flex-col gap-1" aria-label="Primary">
          {RAIL.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${pathname === item.href ? 'bg-cream' : ''}`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <span aria-hidden>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-cream flex items-center justify-between gap-2 px-4 pt-4">
          <p className="font-display text-2xl">
            {greeting()}, {activePerson?.name ?? 'family'}
          </p>
          <div className="flex items-center gap-2">
            {token && (
              <span className="border-line bg-surface rounded-sm border px-2 py-0.5 text-xs" role="status">
                ✓ Up to date
              </span>
            )}
            {activePerson && (
              <button
                className="bg-surface border-line rounded-md border px-2 py-1 text-sm"
                onClick={() => setProfilesOpen(true)}
                aria-label={`Switch profile (currently ${activePerson.name})`}
              >
                🙂
              </button>
            )}
          </div>
        </header>

        {viewAsPersonId && (
          <div className="bg-mustard text-ink mx-4 mt-2 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold" role="status">
            <span>Previewing as {viewedName ?? 'member'} — read-only</span>
            <button
              className="underline"
              onClick={() => {
                dispatch(exitViewAs());
                clearApiCache();
              }}
            >
              Exit
            </button>
          </div>
        )}

        <ProfileSwitcher open={profilesOpen} onClose={() => setProfilesOpen(false)} />

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-2 lg:pb-12">{children}</main>

        <button
          className="bg-terracotta text-terracotta-ink fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full text-2xl shadow-lift lg:bottom-8 lg:right-8"
          onClick={() => setCreateOpen(true)}
          aria-label="Create"
        >
          +
        </button>

        <nav
          className="border-line bg-surface fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Primary"
          data-no-print
        >
          {TABS.slice(0, 2).map((item) => (
            <Tab key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname === item.href} />
          ))}
          <span className="w-12" aria-hidden />
          {TABS.slice(2).map((item) => (
            <Tab key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname === item.href} />
          ))}
        </nav>

        <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Create">
          <div className="flex flex-col gap-2">
            <Button onClick={() => setCreateOpen(false)}>🧺 Responsibility</Button>
            <Button tone="quiet" onClick={() => setCreateOpen(false)}>
              🛒 Shopping item
            </Button>
            <Button tone="quiet" onClick={() => setCreateOpen(false)}>
              🙂 Person
            </Button>
            <Button tone="quiet" disabled title="Coming with the finance module">
              Expense — soon
            </Button>
            <Button tone="quiet" disabled title="Coming with the finance module">
              Bill — soon
            </Button>
          </div>
        </Sheet>
      </div>
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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
