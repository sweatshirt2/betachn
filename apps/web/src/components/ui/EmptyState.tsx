import type { ReactNode } from 'react';

export function EmptyState({
  emoji,
  title,
  hint,
  action,
}: {
  emoji: string;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <p className="font-display mt-3 text-lg">{title}</p>
      <p className="text-muted mt-1 text-sm">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-line animate-pulse rounded-md ${className}`} aria-hidden />;
}
