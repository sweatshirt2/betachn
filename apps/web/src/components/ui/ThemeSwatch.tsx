/**
 * ThemeSwatch — a miniature of the app itself, painted entirely by the
 * named theme's live tokens (UI/UX iteration 2).
 *
 * Each pick used to render two abstract circles from a hand-copied hex
 * table that drifted from tokens.css on every retune — colors mapped to
 * nothing in the real UI. This preview instead scopes a subtree with
 * `data-theme` (tokens.css is a [data-theme] variable set) and paints
 * real primitives — page wash, task card, primary-wash tile, hairlines,
 * navbar — so the picker previews exactly what switching will look like,
 * and can never drift: there are no raw hexes here.
 */
import { Glyph } from './Glyph';
export function ThemeSwatch({ theme, className = '' }: { theme: string; className?: string }) {
  return (
    <div
      data-theme={theme}
      className={`bg-page-wash border-line/70 relative w-full overflow-hidden rounded-sm border p-2 ${className}`}
      aria-hidden
    >
      {/* mini header: glyph tile on the primary wash + text bars */}
      <div className="flex items-center gap-1.5">
        <span className="bg-primary-wash shadow-soft flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
          <Glyph name="dishes" className="text-primary-ink-on h-2.5 w-2.5" />
        </span>
        <span className="bg-line h-1.5 w-12 rounded-full" />
        <span className="bg-line/70 ml-auto h-1.5 w-3 rounded-full" />
      </div>
      {/* a task card: title, meta line, due pill */}
      <div className="bg-surface border-line/60 mt-1.5 rounded-sm border px-1.5 py-1">
        <div className="bg-ink/30 h-1.5 w-16 rounded-full" />
        <div className="mt-1 flex items-center gap-1">
          <span className="bg-wash text-wash-ink rounded-full px-1 py-px text-[7px] font-bold leading-none">Tue</span>
          <span className="bg-line h-1 w-9 rounded-full" />
        </div>
      </div>
      <div className="bg-surface border-line/60 mt-1 rounded-sm border px-1.5 py-1">
        <div className="bg-ink/30 h-1.5 w-12 rounded-full" />
        <div className="bg-line mt-1 h-1 w-14 rounded-full" />
      </div>
      {/* mini navbar: active tab is the primary */}
      <div className="bg-surface/95 border-line/60 mt-1.5 flex items-center justify-around rounded-sm border px-1 py-1">
        <span className="bg-terracotta h-2 w-2 rounded-full" />
        <span className="bg-line h-2 w-2 rounded-full" />
        <span className="bg-line h-2 w-2 rounded-full" />
        <span className="bg-line h-2 w-2 rounded-full" />
        <span className="bg-line h-2 w-2 rounded-full" />
      </div>
    </div>
  );
}
