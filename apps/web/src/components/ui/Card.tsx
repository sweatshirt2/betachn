import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface text-ink rounded-lg shadow-soft border border-line p-4 ${className}`}>
      {children}
    </div>
  );
}
