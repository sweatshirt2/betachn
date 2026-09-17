import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { PersonAvatar } from './PersonAvatar';
import { Glyph, choreGlyph, type GlyphName } from './Glyph';

/**
 * Scenario-specific task presentations (plan §5.1, §5.3) — the same task
 * wears different clothes depending on where it appears:
 *
 * - TaskActionRow: today's "up next" items — soft card with a crayon wash
 *   tile, assignee avatars and the one-tap check. Built for action.
 * - TaskMissedRow: grace-window recoveries — clay-red wash tile, due-date +
 *   assignee context, complete/skip pair. No left border rail: the wash
 *   itself carries the urgency (iteration-3 redesign).
 * - TaskDoneRow: completed/missed reports — calm wash, no decoration,
 *   optionally still completable within grace.
 * - TaskCard: management card (chores page) — category-glyph tile on a
 *   crayon wash, due pill, assignee avatars.
 * - TaskUpcomingRow: future items — quiet surface rows with a weekday/date
 *   pill, glyph tile and assignee stack; scannable but calm.
 *
 * List-card v2 anatomy (UI/UX iteration 1) + iteration-3 refinement: the
 * state rail moved from a thin left border into the tile background —
 * urgency reads through color mass, not decoration.
 */

const CRAYON_COUNT = 4;

/** Cycles the theme's crayon accents so lists feel hand-decorated. */
export function crayon(index: number): string {
  return `var(--chorify-crayon-${(index % CRAYON_COUNT) + 1})`;
}

export type RowPerson = { initial: string; label: string; emoji?: string | null };

/** Stacked assignee avatars (≤3 + overflow) — family-warm, never initial dots. */
function AvatarStack({ people, size }: { people: RowPerson[]; size: 'xs' | 'sm' }) {
  const visible = people.slice(0, 3);
  const extra = people.length - visible.length;
  if (visible.length === 0) return null;
  return (
    <span className="flex -space-x-1.5">
      {visible.map((p, i) =>
        p.emoji ? (
          <PersonAvatar key={`${p.label}-${i}`} emoji={p.emoji} index={i} size={size} className={size === 'xs' ? 'ring-surface ring-2' : ''} />
        ) : (
          <span
            key={`${p.label}-${i}`}
            title={p.label}
            className={`bg-surface border-line shadow-soft flex items-center justify-center rounded-full border text-[10px] font-bold ${
              size === 'xs' ? 'h-6 w-6' : 'h-7 w-7'
            }`}
          >
            {p.initial}
          </span>
        ),
      )}
      {extra > 0 && (
        <span
          title={`+${extra}`}
          className={`bg-surface border-line shadow-soft flex items-center justify-center rounded-full border text-[10px] font-bold ${
            size === 'xs' ? 'h-6 w-6' : 'h-7 w-7'
          }`}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

/** Crayon-washed glyph tile — the category spot of a row. */
export function GlyphTile({
  glyph,
  wash,
  size = 'md',
}: {
  glyph: GlyphName;
  /** CSS color for the tile wash; defaults to the first crayon. */
  wash?: string;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const glyphBox = size === 'sm' ? 'h-4.5 w-4.5' : 'h-5.5 w-5.5';
  return (
    <span
      aria-hidden
      className={`text-ink flex shrink-0 items-center justify-center rounded-[34%] ${box}`}
      style={{ background: wash ?? crayon(0) }}
    >
      <Glyph name={glyph} className={glyphBox} />
    </span>
  );
}

export function TaskActionRow({
  title,
  meta,
  accent,
  overdue = false,
  done = false,
  glyph,
  people = [],
  action,
  secondaryAction,
  className = '',
  style,
}: {
  title: ReactNode;
  meta?: ReactNode;
  /** Crayon wash color for the glyph tile. */
  accent?: string;
  /** Overdue items wear a clay-red wash so urgency reads at a glance. */
  overdue?: boolean;
  /** Completed items calm down to a wash tile. */
  done?: boolean;
  /** Category glyph; defaults to a keyword match on the string title. */
  glyph?: GlyphName;
  people?: RowPerson[];
  action?: ReactNode;
  /** Secondary control (e.g. skip) rendered beside the main action. */
  secondaryAction?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const resolvedGlyph = glyph ?? (typeof title === 'string' ? choreGlyph(title) : 'basket');
  const tileWash = overdue
    ? 'var(--chorify-danger-soft)'
    : done
      ? 'var(--chorify-wash-bg)'
      : (accent ?? crayon(0));
  return (
    <div
      style={style}
      className={`bg-card-wash border-line shadow-soft lift-hover flex min-h-[3.5rem] items-center gap-3 rounded-xl border px-3 py-2.5 ${className}`}
    >
      <GlyphTile glyph={resolvedGlyph} wash={tileWash} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] leading-snug ${overdue ? 'font-extrabold' : 'font-bold'}`}>{title}</p>
        {meta && <p className="text-muted mt-0.5 truncate text-xs font-semibold">{meta}</p>}
      </div>
      <AvatarStack people={people} size="xs" />
      {(secondaryAction ?? action) && (
        <span className="flex shrink-0 items-center gap-1.5">
          {secondaryAction}
          {action}
        </span>
      )}
    </div>
  );
}

/**
 * Missed-in-grace row (iteration-3): clay wash tile + title + "was due X ·
 * who" meta line, optional overdue chip and a complete/skip pair. No border
 * rail — the tile carries the state.
 */
export function TaskMissedRow({
  title,
  meta,
  chip,
  glyph,
  people = [],
  action,
  secondaryAction,
  className = '',
  style,
}: {
  title: ReactNode;
  meta?: ReactNode;
  /** Small state chip (e.g. "3 days late"). */
  chip?: ReactNode;
  glyph?: GlyphName;
  people?: RowPerson[];
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const resolvedGlyph = glyph ?? (typeof title === 'string' ? choreGlyph(title) : 'basket');
  return (
    <div
      style={style}
      className={`bg-card-wash border-line/70 shadow-soft lift-hover flex min-h-[3.75rem] items-center gap-3 rounded-xl border px-3 py-2.5 ${className}`}
    >
      <GlyphTile glyph={resolvedGlyph} wash="var(--chorify-danger-soft)" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-snug">{title}</p>
        {meta && <p className="text-muted mt-0.5 truncate text-xs font-semibold">{meta}</p>}
      </div>
      {chip}
      <AvatarStack people={people} size="xs" />
      {(secondaryAction ?? action) && (
        <span className="flex shrink-0 items-center gap-1.5">
          {secondaryAction}
          {action}
        </span>
      )}
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
      className={`bg-wash border-line/60 flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-3 py-2 ${className}`}
    >
      <span
        className="border-line/60 bg-surface flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
        aria-hidden
      >
        ✓
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {meta && <p className="text-wash-ink/80 mt-0.5 truncate text-xs">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Management task card (chores page): full-height decorated card with a
 * category-glyph tile on a crayon wash, title + meta, due-date pill, stacked
 * assignee avatars and the one-tap check — all vertically centered on one
 * optical line (iteration-3 alignment fix). The middle (title/meta) is the
 * tap target. Glyph is derived from the title when not given explicitly.
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
  people?: RowPerson[];
  href?: string;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const resolvedGlyph = glyph ?? (typeof title === 'string' ? choreGlyph(title) : 'basket');
  return (
    <div
      style={style}
      className={`bg-card-wash border-line shadow-soft lift-hover flex min-h-[4rem] items-center gap-3.5 rounded-xl border p-3.5 ${className}`}
    >
      <GlyphTile glyph={resolvedGlyph} wash={crayon(crayonIndex)} />
      {href ? (
        <Link href={href} className="min-w-0 flex-1">
          <CardBody title={title} meta={meta} dueLabel={dueLabel} overdue={overdue} people={people} />
        </Link>
      ) : (
        <div className="min-w-0 flex-1">
          <CardBody title={title} meta={meta} dueLabel={dueLabel} overdue={overdue} people={people} />
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
  people,
}: {
  title: ReactNode;
  meta?: ReactNode;
  dueLabel?: ReactNode;
  overdue: boolean;
  people: RowPerson[];
}) {
  return (
    <>
      <p className="truncate text-[15px] font-bold leading-snug">{title}</p>
      {meta && <p className="text-muted mt-0.5 truncate text-xs font-semibold">{meta}</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        {dueLabel && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              overdue ? 'bg-clay-red text-cream' : 'bg-surface-alt text-ink border-line border'
            }`}
          >
            {dueLabel}
          </span>
        )}
        <AvatarStack people={people} size="xs" />
      </div>
    </>
  );
}

/**
 * Upcoming row (iteration-3): quiet surface card with a crayon glyph tile,
 * weekday+date pill and assignee stack — calm but no longer a bare text line.
 */
export function TaskUpcomingRow({
  title,
  meta,
  glyph,
  people = [],
  crayonIndex = 0,
  className = '',
  style,
}: {
  title: ReactNode;
  meta?: ReactNode;
  glyph?: GlyphName;
  people?: RowPerson[];
  crayonIndex?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const resolvedGlyph = glyph ?? (typeof title === 'string' ? choreGlyph(title) : 'basket');
  return (
    <div
      style={style}
      className={`bg-surface-alt/70 border-line/60 text-ink flex min-h-[3rem] items-center gap-3 rounded-xl border px-3 py-2 ${className}`}
    >
      <GlyphTile glyph={resolvedGlyph} wash={crayon(crayonIndex)} size="sm" />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
      {meta && (
        <span className="border-line bg-surface text-ink/80 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold">
          {meta}
        </span>
      )}
      <AvatarStack people={people} size="xs" />
    </div>
  );
}
