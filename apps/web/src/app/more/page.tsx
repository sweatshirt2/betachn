'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';

const LINKS = [
  { href: '/activity', label: 'Activity', icon: '📜' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/supplies', label: 'Supplies', icon: '🧴' },
  { href: '/shopping', label: 'Shopping', icon: '🛒' },
  { href: '/home', label: 'Home', icon: '🏡' },
  { href: '/routines', label: 'Routines', icon: '🌅' },
  { href: '/print', label: 'Print week', icon: '🖨️' },
  { href: '/settings', label: 'Settings', icon: '🔧' },
  { href: '/theme-preview', label: 'Theme preview', icon: '🎨' },
];

export default function MorePage() {
  return (
    <div>
      <h1 className="font-display text-2xl">More</h1>
      <div className="mt-3 flex flex-col gap-2">
        {LINKS.map((l) => (
          <Card key={l.href} className="py-2">
            <Link href={l.href} className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>
                {l.icon}
              </span>
              <span className="text-sm font-semibold">{l.label}</span>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
