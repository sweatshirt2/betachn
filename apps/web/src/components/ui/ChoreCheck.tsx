'use client';

import { Glyph } from './Glyph';

/**
 * One-tap completion check (§5.3): spring pop + wash sweep when the
 * occurrence turns completed; undo simply flips data-done back — no animation
 * on the way back, per the undo-is-calm principle. The ✓ is the Glyph stroke
 * circle-check (emoji-free chrome) and the button self-centers so it sits on
 * the same optical line as the row's glyph tile.
 */
export function ChoreCheck({
  done,
  onClick,
  label,
  disabled,
}: {
  done: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="chore-check border-line bg-surface text-muted shadow-soft my-auto flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border text-base font-bold"
      data-done={done}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={done}
    >
      <Glyph name="check-circle" className="h-5.5 w-5.5" aria-hidden />
    </button>
  );
}
