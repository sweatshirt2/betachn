import type { ReactNode } from 'react';
import { Glyph, type GlyphName } from './Glyph';

/**
 * Empty/error/sign-in states speak in generated stroke art (Glyph), never
 * emojis (UI/UX iteration 1): a soft wash tile behind a theme-colored glyph.
 */
export function EmptyState({
  art,
  title,
  hint,
  action,
}: {
  /** Glyph name — the intuitive, descriptive stand-in for the old emoji. */
  art: GlyphName;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span
        aria-hidden
        className="bg-surface-alt/80 border-line/70 shadow-soft flex h-20 w-20 items-center justify-center rounded-[34%] border"
      >
        <Glyph name={art} className="text-muted h-9 w-9" />
      </span>
      <p className="font-display mt-3 text-lg">{title}</p>
      <p className="text-muted mt-1 text-sm">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-line animate-pulse rounded-md ${className}`} aria-hidden />;
}
