'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Glyph } from './Glyph';

/**
 * Drag-to-reorder list row (§5.3 / D115): touch drag via a visible handle
 * (touch-only per D115 — desktop keeps the plain list). While dragging, the
 * row floats under the pointer and drop position is reported as neighbors
 * (before/after item ids), letting the server/device twin compute the
 * sparse sortKey. Optimistic: the visual order updates immediately; the
 * mutation reconciles.
 */
export function DragRow({
  itemId,
  onReorder,
  disabled = false,
  children,
}: {
  itemId: string;
  /** Called with the neighbor ids of the drop slot (whichever side is known). */
  onReorder: (v: { itemId: string; beforeItemId: string | null; afterItemId: string | null }) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startY: number;
    rowH: number;
    rows: Array<{ id: string; top: number; h: number; el: HTMLElement }>;
  } | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

  const collectRows = () => {
    const list = rowRef.current?.parentElement;
    if (!list) return [];
    return Array.from(list.querySelectorAll<HTMLElement>('[data-drag-id]')).map((el) => ({
      id: el.dataset.dragId ?? '',
      top: el.getBoundingClientRect().top,
      h: el.getBoundingClientRect().height,
      el,
    }));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'touch' || disabled) return;
    e.preventDefault();
    const row = rowRef.current;
    if (!row) return;
    dragState.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      rowH: row.getBoundingClientRect().height,
      rows: collectRows(),
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const st = dragState.current;
    if (!st || e.pointerId !== st.pointerId) return;
    setDy(e.clientY - st.startY);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const st = dragState.current;
    if (!st || e.pointerId !== st.pointerId) return;
    dragState.current = null;
    setDragging(false);
    const delta = e.clientY - st.startY;
    if (Math.abs(delta) < 24) {
      setDy(0);
      return;
    }
    const row = rowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    // Neighbors in the VISUAL (post-drag) order: the row we land above is
    // `before`, the one we land below is `after` (exclusive of self).
    const others = st.rows
      .filter((r) => r.id !== itemId)
      .map((r) => ({ id: r.id, center: r.top + r.h / 2 }))
      .sort((a, b) => a.center - b.center);
    const after = others.filter((o) => o.center < centerY).pop() ?? null;
    const before = others.find((o) => o.center > centerY) ?? null;
    if ((after && after.id !== itemId) || (before && before.id !== itemId)) {
      onReorder({
        itemId,
        beforeItemId: before?.id ?? null,
        afterItemId: after?.id ?? null,
      });
    }
    setDy(0);
  };

  return (
    <div
      ref={rowRef}
      data-drag-id={itemId}
      className="relative"
      style={{
        transform: `translateY(${dy}px) scale(${dragging ? 1.02 : 1})`,
        transition: dragging ? 'none' : 'transform 200ms var(--chorify-motion-spring)',
        zIndex: dragging ? 10 : undefined,
        boxShadow: dragging ? 'var(--chorify-shadow-pop, 0 8px 24px rgba(0,0,0,0.15))' : undefined,
      }}
    >
      {children}
      {/* Drag handle: visible on touch, the D115 sanctioned affordance. */}
      <button
        type="button"
        aria-label={t('ops.dragAria')}
        disabled={disabled}
        className="text-muted/60 absolute inset-y-0 right-1 flex w-9 touch-none items-center justify-center"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Glyph name="grip" className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
