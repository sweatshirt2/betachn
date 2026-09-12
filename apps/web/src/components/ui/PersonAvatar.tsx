'use client';

/**
 * Family avatar tile (§5.1): emoji on a per-person pastel tile, cycled
 * through the theme crayons so the household wall feels hand-decorated.
 */
export function PersonAvatar({
  emoji,
  index = 0,
  size = 'md',
  className = '',
}: {
  emoji: string;
  index?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: { box: 'h-8 w-8 text-lg rounded-[30%]', n: 4 },
    md: { box: 'h-14 w-14 text-3xl rounded-[34%]', n: 4 },
    lg: { box: 'h-20 w-20 text-4xl rounded-[36%]', n: 4 },
  } as const;
  const s = sizes[size];
  return (
    <span
      aria-hidden
      className={`shadow-soft inline-flex items-center justify-center leading-none ${s.box} ${className}`}
      style={{ background: `var(--chorify-crayon-${(index % s.n) + 1})` }}
    >
      {emoji}
    </span>
  );
}
