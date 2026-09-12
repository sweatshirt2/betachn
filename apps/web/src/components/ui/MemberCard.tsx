import type { CSSProperties, ReactNode } from 'react';
import { PersonAvatar } from './PersonAvatar';

/**
 * Member card (§5.5) — the shared family member surface used by the
 * household wall and the Family page. ONE component so tweaks land
 * everywhere at once.
 *
 * Anatomy, in reading order:
 *   tile   — PersonAvatar crayon tile (the person's "spot on the wall")
 *   header — name · owner star · role line · facts tag (age / gender / both)
 *   facts  — optional CountStat strip (today · done · missed)
 *   extra  — optional bottom zone (duty stream, chevron affordance lives on
 *            the tap row)
 *
 * Interaction: the whole header is one tap target (interactive ?) with the
 * spring press; facts counts stay facts — never ranked, never tappable.
 */

export type MemberFacts = Array<{ label: string; value: number }>;

export function MemberCard({
  emoji,
  index = 0,
  name,
  owner = false,
  role,
  factsTag,
  facts,
  interactive = true,
  onOpen,
  chevron = true,
  extra,
  style,
  className = '',
}: {
  emoji: string;
  /** Stable person index — drives the crayon color. */
  index?: number;
  name: ReactNode;
  owner?: boolean;
  role?: ReactNode;
  /** Small tag after the role: e.g. "12 · girl". Rendered subdued. */
  factsTag?: ReactNode;
  facts?: MemberFacts;
  /** When false the card renders as a surface (no button, no chevron). */
  interactive?: boolean;
  onOpen?: () => void;
  chevron?: boolean;
  extra?: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const header = (
    <>
      <PersonAvatar emoji={emoji} index={index} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-base font-bold leading-tight text-ink">{name}</span>
          {owner && (
            <span className="text-accent shrink-0 text-sm leading-none" aria-label="owner">
              ★
            </span>
          )}
        </span>
        {(role != null || factsTag != null) && (
          <span className="text-muted mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
            {role != null && <span className="truncate">{role}</span>}
            {role != null && factsTag != null && <span aria-hidden>·</span>}
            {factsTag != null && <span className="shrink-0">{factsTag}</span>}
          </span>
        )}
      </span>
      {interactive && chevron && (
        <span className="text-muted shrink-0 pr-1" aria-hidden>
          ›
        </span>
      )}
    </>
  );

  return (
    <div
      style={style}
      className={`border-line bg-card-wash shadow-soft lift-hover flex flex-col rounded-lg border ${className}`}
    >
      {interactive ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full flex-1 items-center gap-3.5 p-3.5 text-left tap-spring"
        >
          {header}
        </button>
      ) : (
        <div className="flex w-full flex-1 items-center gap-3.5 p-3.5">{header}</div>
      )}
      {extra}
    </div>
  );
}
