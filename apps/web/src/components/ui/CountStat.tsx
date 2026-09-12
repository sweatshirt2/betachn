import type { CSSProperties, ReactNode } from 'react';

/**
 * Stat card (§5.5) — a single number with its label, engineered ONCE so every
 * count in the app aligns the same way:
 *   tall    — the card IS the number (household "stocked" tiles, weekly
 *             banner). Baseline-aligned pair, capped optical size.
 *   strip   — cells inside a segmented facts strip (Family member cards,
 *             PersonSheet). Numbers share one optical baseline; labels are
 *             locked to a single line with ellipsis.
 *
 * Values are display-rounded (99+); separators render only between cells
 * when the caller spreads them — the grid owns equal widths.
 */
export function CountStat({
  value,
  label,
  align = 'center',
  emphasis = 'strip',
  className = '',
  style,
}: {
  /** Numbers are display-rounded (99+); rendered nodes (e.g. TickNumber) pass through. */
  value: number | ReactNode;
  label?: string;
  align?: 'center' | 'start';
  emphasis?: 'strip' | 'tall';
  className?: string;
  style?: CSSProperties;
}) {
  const n = typeof value === 'number' ? (value > 99 ? '99+' : String(value)) : value;
  if (emphasis === 'tall') {
    return (
      <div
        style={style}
        className={`border-line bg-card-wash shadow-soft lift-hover flex flex-col justify-between rounded-lg border p-3 ${className}`}
      >
        <span className="font-display text-3xl leading-none tracking-tight text-ink">{n}</span>
        {label != null && (
          <span className="text-muted mt-2 line-clamp-2 min-h-[2em] text-xs font-semibold leading-snug">{label}</span>
        )}
      </div>
    );
  }
  const alignCls = align === 'start' ? 'items-start text-left' : 'items-center text-center';
  return (
    <div style={style} className={`flex min-w-0 flex-col ${alignCls} ${className}`}>
      <span className="font-display text-lg leading-none text-ink">{n}</span>
      {label != null && (
        <span className="text-muted mt-1 w-full truncate text-[10px] font-semibold leading-tight">{label}</span>
      )}
    </div>
  );
}
