import type { CSSProperties, ReactNode } from 'react';

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
    <div style={style} className={`bg-surface text-ink rounded-lg shadow-soft border border-line p-4 ${className}`}>
      {children}
    </div>
  );
}
