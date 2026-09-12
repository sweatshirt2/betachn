import type { CSSProperties, ReactNode } from 'react';

/**
 * Base surface (§5.1): gradient-washed card with hairline border, layered
 * soft shadow and a gentle hover lift on pointer devices. All values are
 * theme tokens, so every theme re-skins it automatically.
 */
export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`bg-card-wash text-ink lift-hover border-line shadow-soft rounded-lg border p-4 ${className}`}
    >
      {children}
    </div>
  );
}
