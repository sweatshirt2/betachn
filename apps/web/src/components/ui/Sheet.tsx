'use client';

import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-label={t('common.close')}
        tabIndex={-1}
      />
      <div className="sheet-panel bg-surface text-ink relative w-full max-w-lg rounded-t-lg p-5 shadow-lift sm:rounded-lg">
        <h2 className="font-display text-xl">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
