import type { ReactNode } from 'react';

/**
 * AuthArt (§5.8 warm aesthetic) — hand-drawn-feel, minimalist stroke SVGs
 * for the welcome surfaces. Meaning-first: house = household, figures =
 * people, bubbles = language, heart = family. Every stroke resolves to a
 * theme token via `currentColor`, so the art re-skins with the theme.
 *
 * No emojis, no fills except deliberate accents — lines only, like the
 * rest of the crayon system.
 */

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** One minimal person: round head + shoulder arc. */
function Figure({ x, y, className }: { x: number; y: number; className: string }) {
  return (
    <g className={className} {...strokeProps}>
      <circle cx={x} cy={y} r={4.5} />
      <path d={`M ${x - 6} ${y + 17} Q ${x} ${y + 3} ${x + 6} ${y + 17}`} />
    </g>
  );
}

function Art({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 90"
      role="img"
      aria-hidden
      className={`mx-auto h-auto w-44 text-ink ${className}`}
      {...strokeProps}
    >
      {children}
    </svg>
  );
}

export type AuthArtVariant = 'welcome' | 'household' | 'people' | 'language';

/** Pick the art that matches the surface's meaning. */
export function AuthArt({ variant, className }: { variant: AuthArtVariant; className?: string }) {
  switch (variant) {
    case 'welcome':
      return <WelcomeArt className={className} />;
    case 'household':
      return <HouseholdArt className={className} />;
    case 'people':
      return <PeopleArt className={className} />;
    case 'language':
      return <LanguageArt className={className} />;
  }
}

/** Sign-in: the family home, sun up, everyone outside. */
function WelcomeArt({ className = '' }: { className?: string }) {
  return (
    <Art className={className}>
      {/* sun */}
      <g className="text-mustard">
        <circle cx={100} cy={14} r={6} />
        <path d="M100 4.5v-2.5" />
        <path d="M109.5 14H112" />
        <path d="M106.7 7.3l1.8-1.8" />
        <path d="M93.3 7.3l-1.8-1.8" />
      </g>
      {/* roof + body */}
      <path className="text-olive" d="M22 42 L58 14 L94 42" />
      <rect className="text-terracotta" x={32} y={42} width={52} height={34} rx={7} />
      {/* window + arched door */}
      <circle className="text-sky" cx={42} cy={54} r={5.5} />
      <path className="text-mustard" d="M64 76 v-11 a6 6 0 0 1 12 0 v11" />
      {/* family in front */}
      <Figure x={38} y={62} className="text-crayon-1" />
      <Figure x={50} y={59} className="text-crayon-2" />
      <Figure x={60} y={63} className="text-crayon-4" />
      {/* ground */}
      <path className="text-line" d="M14 82 H106" />
    </Art>
  );
}

/** Household setup: the home with a heart over it. */
function HouseholdArt({ className = '' }: { className?: string }) {
  return (
    <Art className={className}>
      <path className="text-olive" d="M26 46 L60 20 L94 46" />
      <rect className="text-terracotta" x={38} y={46} width={44} height={30} rx={7} />
      <circle className="text-sky" cx={48} cy={58} r={5} />
      <path className="text-mustard" d="M60 76 v-10 a6 6 0 0 1 12 0 v10" />
      {/* heart over the roof */}
      <path
        className="text-clay-red"
        fill="currentColor"
        stroke="none"
        d="M60 14 C57 8 48 9 48 15 C48 20 55 23 60 27 C65 23 72 20 72 15 C72 9 63 8 60 14 Z"
      />
      <path className="text-line" d="M18 82 H102" />
    </Art>
  );
}

/** Add people: three figures and a plus badge. */
function PeopleArt({ className = '' }: { className?: string }) {
  return (
    <Art className={className}>
      <Figure x={32} y={46} className="text-crayon-1" />
      <Figure x={58} y={40} className="text-crayon-2" />
      <Figure x={84} y={46} className="text-crayon-4" />
      {/* plus badge */}
      <g className="text-terracotta">
        <circle cx={102} cy={18} r={8} />
        <path d="M102 14.5v7" />
        <path d="M98.5 18h7" />
      </g>
      <path className="text-line" d="M16 72 H104" />
    </Art>
  );
}

/** Language: two overlapping speech bubbles. */
function LanguageArt({ className = '' }: { className?: string }) {
  return (
    <Art className={className}>
      <g className="text-olive">
        <rect x={20} y={16} width={46} height={27} rx={13} />
        <path d="M32 43 L27 53 L40 43" />
        <circle cx={35} cy={29.5} r={1.8} fill="currentColor" stroke="none" />
        <circle cx={43} cy={29.5} r={1.8} fill="currentColor" stroke="none" />
        <circle cx={51} cy={29.5} r={1.8} fill="currentColor" stroke="none" />
      </g>
      <g className="text-terracotta">
        <rect x={54} y={40} width={46} height={27} rx={13} fill="var(--chorify-surface)" />
        <path d="M88 67 L93 77 L81 67" fill="var(--chorify-surface)" />
        <circle cx={68} cy={53.5} r={1.8} fill="currentColor" stroke="none" />
        <circle cx={76} cy={53.5} r={1.8} fill="currentColor" stroke="none" />
        <circle cx={84} cy={53.5} r={1.8} fill="currentColor" stroke="none" />
      </g>
    </Art>
  );
}
