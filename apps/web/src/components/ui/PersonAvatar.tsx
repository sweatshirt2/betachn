'use client';

/**
 * Family avatar tile (§5.1): the person's initial on a per-person pastel
 * tile, cycled through the theme crayons so the household wall feels
 * hand-decorated. Emoji avatars are retired (§8 emoji-free chrome): the
 * initial in the display face is the identity mark — warm, distinct per
 * person, and renders identically on every platform. The `avatarEmoji`
 * column stays in the data model (server/mobile contract) but is no longer
 * rendered anywhere.
 */
export function PersonAvatar({
  name,
  index = 0,
  size = 'md',
  className = '',
}: {
  /** Person display name — the initial becomes the identity mark. */
  name: string;
  index?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    xs: { box: 'h-6 w-6 text-[11px] rounded-full' },
    sm: { box: 'h-8 w-8 text-sm rounded-[30%]' },
    md: { box: 'h-14 w-14 text-2xl rounded-[34%]' },
    lg: { box: 'h-20 w-20 text-3xl rounded-[36%]' },
  } as const;
  const s = sizes[size];
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden
      className={`shadow-soft font-display inline-flex items-center justify-center font-bold leading-none ${s.box} ${className}`}
      style={{ background: `var(--chorify-crayon-${(index % 4) + 1})` }}
    >
      {initial}
    </span>
  );
}
