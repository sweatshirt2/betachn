'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Toast = { id: number; message: string; actionLabel?: string; onAction?: () => void };

const ToastContext = createContext<{ toast: (message: string, action?: { label: string; run: () => void }) => void }>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, action?: { label: string; run: () => void }) => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, actionLabel: action?.label, onAction: action?.run }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-card-wash text-ink border-line shadow-lift toast-in pointer-events-auto flex items-center gap-3 rounded-md border px-4 py-2"
            role="status"
          >
            <span className="text-sm">{t.message}</span>
            {t.actionLabel && (
              <button
                className="text-terracotta text-sm font-bold"
                onClick={() => {
                  t.onAction?.();
                  setToasts((current) => current.filter((x) => x.id !== t.id));
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
