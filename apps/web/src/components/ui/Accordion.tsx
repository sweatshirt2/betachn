'use client';

import { useState, type ReactNode } from 'react';
import { Glyph } from './Glyph';

/**
 * Accordion (UI/UX iteration 1): a soft disclosure card for grouping
 * related controls — Settings "Security & privacy" wraps the passcode
 * changer and future privacy rows so the page stays scannable. Hairline
 * card, chevron half-turn, height animates via the standard motion tokens;
 * reduced-motion collapses it to an instant toggle (globals.css media).
 */
export function Accordion({
  title,
  glyph,
  children,
  defaultOpen = false,
  hint,
}: {
  title: string;
  /** Optional stroke glyph leading the header row. */
  glyph?: Parameters<typeof Glyph>[0]['name'];
  children: ReactNode;
  defaultOpen?: boolean;
  /** Muted helper line under the title. */
  hint?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card-wash border-line shadow-soft overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap-spring flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {glyph && (
          <span aria-hidden className="bg-surface-alt border-line text-ink flex h-9 w-9 shrink-0 items-center justify-center rounded-[30%] border">
            <Glyph name={glyph} className="h-4.5 w-4.5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">{title}</span>
          {hint && <span className="text-muted mt-0.5 block truncate text-xs">{hint}</span>}
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className={`text-muted h-4 w-4 shrink-0 transition-transform duration-200 [transition-timing-function:var(--chorify-motion-spring)] ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
      {open && <div className="border-line/70 flex flex-col gap-2 border-t px-4 py-3.5">{children}</div>}
    </div>
  );
}
