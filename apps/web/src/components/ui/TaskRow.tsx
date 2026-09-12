import type { CSSProperties, ReactNode } from 'react';

/**
 * Scenario-specific task presentations (plan §5.1, §5.3) — the same task
 * wears different clothes depending on where it appears:
 *
 * - TaskActionRow: today's "up next" items — soft card with a crayon edge
 *   stripe and the one-tap check. Built for action.
 * - TaskDoneRow: completed/missed reports — calm wash, no decoration,
 *   optionally still completable within grace.
 * - TaskUpcomingRow: future items — quiet surface rows, date only.
 */

const CRAYON_COUNT = 4;

/** Cycles the theme's crayon accents so lists feel hand-decorated. */
export function crayon(index: number): string {
  return `var(--chorify-crayon-${(index % CRAYON_COUNT) + 1})`;
}

export function TaskActionRow({
  title,
  meta,
  accent,
  action,
  className = '',
  style,
}: {
  title: ReactNode;
  meta?: ReactNode;
  accent?: string;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`bg-card-wash border-line shadow-soft lift-hover flex items-stretch overflow-hidden rounded-lg border ${className}`}
    >
      <span className="w-1.5 shrink-0" style={{ background: accent ?? 'var(--chorify-crayon-1)' }} aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 pr-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          {meta && <p className="text-muted mt-0.5 truncate text-xs">{meta}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function TaskDoneRow({
  title,
  meta,
  action,
  className = '',
  style,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`bg-wash border-line/60 flex items-center gap-3 rounded-lg border px-3 py-2 ${className}`}
    >
      <span
        className="border-line/60 bg-surface flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
        aria-hidden
      >
        ✓
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {meta && <p className="text-muted mt-0.5 truncate text-xs">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

export function TaskUpcomingRow({
  title,
  meta,
  className = '',
  style,
}: {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`bg-surface-alt/70 border-line/60 text-ink flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${className}`}
    >
      <p className="min-w-0 truncate text-sm font-semibold">{title}</p>
      {meta && <span className="text-muted shrink-0 text-xs">{meta}</span>}
    </div>
  );
}
