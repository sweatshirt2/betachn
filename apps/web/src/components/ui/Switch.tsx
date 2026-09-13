'use client';

/**
 * Switch (UI/UX iteration 1): a real track+thumb toggle — off=left,
 * on=right — replacing text pills that read On/Off. Spring thumb, wash fill
 * when on, full keyboard + screen-reader semantics (role="switch",
 * aria-checked), honors prefers-reduced-motion via tap-spring gating.
 */
export function Switch({
  checked,
  onToggle,
  label,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  /** Accessible name — the row's category, spoken with the state. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 ${
        checked ? 'bg-wash border-line/60' : 'bg-surface-alt border-line'
      } ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <span
        aria-hidden
        className={`shadow-soft absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all duration-200 [transition-timing-function:var(--chorify-motion-spring)] ${
          checked ? 'left-[calc(100%-1.375rem)] bg-surface' : 'left-1 bg-surface'
        }`}
      />
      {/* Track dot when off gives the thumb a home; wash glyph when on. */}
      <span
        aria-hidden
        className={`absolute text-[9px] font-extrabold transition-opacity ${
          checked ? 'right-1.5 opacity-0' : 'left-[1.4rem] text-muted opacity-100'
        }`}
      >
        ··
      </span>
    </button>
  );
}
