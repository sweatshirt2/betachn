import type { ReactNode } from 'react';

type ChipTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<ChipTone, string> = {
  default: 'bg-cream text-ink border-line',
  success: 'bg-olive text-terracotta-ink',
  warning: 'bg-mustard text-ink',
  danger: 'bg-clay-red text-terracotta-ink',
  info: 'bg-sky text-ink',
};

export function Chip({ tone = 'default', children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-body text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
