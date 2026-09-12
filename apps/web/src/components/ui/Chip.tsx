import type { ReactNode } from 'react';

type ChipTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

/** Chips wear the theme's pastel accents — tinted, never loud. */
const TONES: Record<ChipTone, string> = {
  default: 'bg-surface-alt text-ink border-line',
  success: 'bg-olive text-ink border-line',
  warning: 'bg-mustard text-ink border-line',
  danger: 'bg-clay-red text-cream border-line',
  info: 'bg-sky text-ink border-line',
};

export function Chip({ tone = 'default', children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-body text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
