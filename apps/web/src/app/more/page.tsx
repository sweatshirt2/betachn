'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';

const LINKS = [
  { href: '/activity', key: 'activity', icon: '📜' },
  { href: '/notifications', key: 'notifications', icon: '🔔' },
  { href: '/supplies', key: 'supplies', icon: '🧴' },
  { href: '/shopping', key: 'shopping', icon: '🛒' },
  { href: '/home', key: 'home', icon: '🏡' },
  { href: '/routines', key: 'routines', icon: '🌅' },
  { href: '/print', key: 'printWeek', icon: '🖨️' },
  { href: '/settings', key: 'settings', icon: '🔧' },
  { href: '/theme-preview', key: 'themePreview', icon: '🎨' },
] as const;

export default function MorePage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="font-display text-2xl">{t('nav.more')}</h1>
      <div className="mt-3 flex flex-col gap-2">
        {LINKS.map((l) => (
          <Card key={l.href} className="py-2">
            <Link href={l.href} className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>
                {l.icon}
              </span>
              <span className="text-sm font-semibold">{t(`nav.${l.key}`)}</span>
              <span className="text-terracotta ml-auto" aria-hidden>
                ›
              </span>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
