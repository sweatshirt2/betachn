'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Card, Glyph, type GlyphName } from '@/components/ui';
import type { ParseKeys } from 'i18next';

const LINKS: Array<{ href: string; glyph: GlyphName; key: ParseKeys<'translation'>; hintKey?: string }> = [
  { href: '/household', glyph: 'people', key: 'nav.household' },
  { href: '/setup/roles', glyph: 'masks', key: 'household.roles' },
  { href: '/chores', glyph: 'basket', key: 'nav.chores' },
  { href: '/routines', glyph: 'sun', key: 'ops.routines' },
  { href: '/home', glyph: 'door', key: 'ops.home' },
  { href: '/supplies', glyph: 'bottle', key: 'ops.supplies' },
  { href: '/notifications', glyph: 'bell', key: 'nav.notifications' },
  { href: '/settings', glyph: 'gear', key: 'nav.settings' },
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
              <span
                aria-hidden
                className="bg-accent-wash text-ink flex h-10 w-10 items-center justify-center rounded-[34%]"
              >
                <Glyph name={l.glyph} className="h-5 w-5" />
              </span>
              <p className="mt-1.5 font-semibold">{t(l.key)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
