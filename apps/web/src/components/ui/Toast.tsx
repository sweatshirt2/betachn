'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Glyph, type GlyphName } from './Glyph';

/**
 * Toast v2 (UI/UX iteration 1): kind-aware pills — success wears the wash
 * pair, error the danger pair, info stays neutral — each led by a stroke
 * glyph, springing in above the navbar. Copy stays conversational (§8);
 * Undo keeps its bold accent.
 */
export type ToastKind = 'success' | 'error' | 'info';

type Toast = { id: number; message: string; kind: ToastKind; actionLabel?: string; onAction?: () => void };

const ToastContext = createContext<{
  toast: (message: string, options?: { kind?: ToastKind; action?: { label: string; run: () => void } }) => void;
}>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

const KIND_STYLES: Record<ToastKind, { wrap: string; glyph: GlyphName }> = {
  success: { wrap: 'bg-wash border-line/60', glyph: 'check-circle' },
  error: { wrap: 'bg-clay-red text-cream border-line/60', glyph: 'alert' },
  info: { wrap: 'bg-card-wash text-ink border-line', glyph: 'info' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, options?: { kind?: ToastKind; action?: { label: string; run: () => void } }) => {
      const id = nextId++;
      const kind = options?.kind ?? 'info';
      setToasts((current) => [
        ...current,
        { id, message, kind, actionLabel: options?.action?.label, onAction: options?.action?.run },
      ]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => {
          const style = KIND_STYLES[t.kind];
          return (
            <div
              key={t.id}
              className={`toast-in shadow-lift pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${style.wrap}`}
              role="status"
            >
              <Glyph name={style.glyph} className={`h-4.5 w-4.5 shrink-0 ${t.kind === 'error' ? '' : 'text-current'}`} />
              <span className="text-sm font-semibold">{t.message}</span>
              {t.actionLabel && (
                <button
                  className="text-terracotta ml-1 text-sm font-extrabold"
                  onClick={() => {
                    t.onAction?.();
                    setToasts((current) => current.filter((x) => x.id !== t.id));
                  }}
                >
                  {t.actionLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
