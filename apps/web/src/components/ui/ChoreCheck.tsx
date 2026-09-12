'use client';

/**
 * One-tap completion check (§5.3): spring pop + wash sweep when the
 * occurrence turns completed; undo simply flips data-done back — no animation
 * on the way back, per the undo-is-calm principle.
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
      className="chore-check border-line bg-surface text-muted shadow-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-base font-bold"
      data-done={done}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={done}
    >
      <span aria-hidden>✓</span>
    </button>
  );
}
