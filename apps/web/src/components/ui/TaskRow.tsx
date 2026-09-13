import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Glyph, choreGlyph, type GlyphName } from './Glyph';

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
  people = [],
  action,
  className = '',
  style,
}: {
  title: ReactNode;
  meta?: ReactNode;
  accent?: string;
  people?: Array<{ initial: string; label: string }>;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const visible = people.slice(0, 3);
  const extra = people.length - visible.length;
  return (
    <div
      style={style}
      className={`bg-card-wash border-line shadow-soft lift-hover flex items-stretch overflow-hidden rounded-lg border ${className}`}
    >
      <span className="w-1.5 shrink-0" style={{ background: accent ?? 'var(--chorify-crayon-1)' }} aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{title}</p>
          {meta && <p className="text-muted mt-0.5 truncate text-xs">{meta}</p>}
        </div>
        {visible.length > 0 && (
          <span className="flex -space-x-1.5">
            {visible.map((p, i) => (
              <span
                key={`${p.label}-${i}`}
                title={p.label}
                className="bg-surface border-line shadow-soft flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold"
              >
                {p.initial}
              </span>
            ))}
            {extra > 0 && (
              <span className="bg-surface border-line shadow-soft flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold">
                +{extra}
              </span>
            )}
          </span>
        )}
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

/**
 * Management task card (chores page): full-height decorated card with a
 * category-glyph tile on a crayon wash, title + meta, due-date pill, stacked
 * assignee avatars and the one-tap check. The middle (title/meta) is the tap
 * target. Glyph is derived from the title when not given explicitly.
 */
export function TaskCard({
  title,
  meta,
  dueLabel,
  overdue = false,
  glyph,
  crayonIndex = 0,
  people = [],
  href,
  action,
  className = '',
  style,
}: {
  title: ReactNode;
  meta?: ReactNode;
  dueLabel?: ReactNode;
  overdue?: boolean;
  /** Category glyph; defaults to a keyword match on the string title. */
  glyph?: GlyphName;
  crayonIndex?: number;
  people?: Array<{ initial: string; label: string }>;
  href?: string;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const visible = people.slice(0, 3);
  const extra = people.length - visible.length;
  const resolvedGlyph = glyph ?? (typeof title === 'string' ? choreGlyph(title) : 'basket');
  return (
    <div
      style={style}
      className={`bg-card-wash border-line shadow-soft lift-hover flex items-center gap-3.5 rounded-lg border p-3.5 ${className}`}
    >
      <span
        aria-hidden
        className="text-ink flex h-11 w-11 shrink-0 items-center justify-center rounded-[34%]"
        style={{ background: crayon(crayonIndex) }}
      >
        <Glyph name={resolvedGlyph} className="h-5.5 w-5.5" />
      </span>
      {href ? (
        <Link href={href} className="min-w-0 flex-1">
          <CardBody title={title} meta={meta} dueLabel={dueLabel} overdue={overdue} visible={visible} extra={extra} />
        </Link>
      ) : (
        <div className="min-w-0 flex-1">
          <CardBody title={title} meta={meta} dueLabel={dueLabel} overdue={overdue} visible={visible} extra={extra} />
        </div>
      )}
      {action}
    </div>
  );
}

function CardBody({
  title,
  meta,
  dueLabel,
  overdue,
  visible,
  extra,
}: {
  title: ReactNode;
  meta?: ReactNode;
  dueLabel?: ReactNode;
  overdue: boolean;
  visible: Array<{ initial: string; label: string }>;
  extra: number;
}) {
  return (
    <>
      <p className="truncate text-[15px] font-bold leading-snug">{title}</p>
      {meta && <p className="text-muted mt-0.5 truncate text-xs font-semibold">{meta}</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        {dueLabel && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              overdue ? 'bg-clay-red text-cream' : 'bg-surface-alt text-muted border-line border'
            }`}
          >
            {dueLabel}
          </span>
        )}
        {visible.length > 0 && (
          <span className="flex -space-x-1.5">
            {visible.map((p, i) => (
              <span
                key={`${p.label}-${i}`}
                title={p.label}
                className="bg-surface border-line shadow-soft flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold"
              >
                {p.initial}
              </span>
            ))}
            {extra > 0 && (
              <span className="bg-surface border-line shadow-soft flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold">
                +{extra}
              </span>
            )}
          </span>
        )}
      </div>
    </>
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
