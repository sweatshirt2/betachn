'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';
import type { Dict } from '@/i18n/dictionaries';
import { NavIcon, type NavIconName } from '@/components/icons';

const LINKS: Array<{ href: string; key: keyof Dict['nav']; icon: NavIconName; crayon: number }> = [
  { href: '/household', key: 'household', icon: 'household', crayon: 1 },
  { href: '/activity', key: 'activity', icon: 'activity', crayon: 2 },
  { href: '/notifications', key: 'notifications', icon: 'notifications', crayon: 3 },
  { href: '/pantry', key: 'pantry', icon: 'supplies', crayon: 4 },
  { href: '/home', key: 'home', icon: 'home', crayon: 1 },
  { href: '/routines', key: 'routines', icon: 'routines', crayon: 2 },
  { href: '/print', key: 'printWeek', icon: 'activity', crayon: 3 },
  { href: '/settings', key: 'settings', icon: 'settings', crayon: 4 },
  { href: '/theme-preview', key: 'themePreview', icon: 'settings', crayon: 1 },
];

export default function MorePage() {
  const { t } = useTranslation();
  return (
    <div className="page-enter">
      <h1 className="font-display text-2xl">{t('nav.more')}</h1>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Card key={l.href} className="lift-hover">
            <Link href={l.href} className="flex items-center gap-3.5">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[32%]"
                style={{ background: `var(--chorify-crayon-${l.crayon})` }}
              >
                <NavIcon name={l.icon} className="text-ink h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{t(`nav.${l.key}`)}</span>
              <span className="text-muted" aria-hidden>
                ›
              </span>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
