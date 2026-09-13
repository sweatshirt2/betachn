'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';
import type { ParseKeys } from 'i18next';

const LINKS: Array<{ href: string; emoji: string; key: ParseKeys<'translation'>; hintKey?: string }> = [
  { href: '/household', emoji: '👨‍👩‍👧', key: 'nav.household' },
  { href: '/setup/roles', emoji: '🎭', key: 'household.roles' },
  { href: '/chores', emoji: '🧺', key: 'nav.chores' },
  { href: '/routines', emoji: '🌅', key: 'ops.routines' },
  { href: '/home', emoji: '🏠', key: 'ops.home' },
  { href: '/supplies', emoji: '🧴', key: 'ops.supplies' },
  { href: '/notifications', emoji: '🔔', key: 'nav.notifications' },
  { href: '/settings', emoji: '⚙️', key: 'nav.settings' },
];

/** Household setup center (§5.4 CN §99) — every setup destination in one place. */
export default function SetupPage() {
  const { t } = useTranslation();
  return (
    <div className="page-enter">
      <h1 className="font-display text-2xl">{t('setup.title')}</h1>
      <p className="text-muted mt-1 text-sm">{t('setup.hint')}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="h-full">
              <p className="text-2xl" aria-hidden>{l.emoji}</p>
              <p className="mt-1 font-semibold">{t(l.key)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
