'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

/**
 * Swipe-right-to-complete wrapper (§5.3, CN micro-6): horizontal drag with a
 * growing green wash + ✓ cue; passing the threshold commits onSwipeRight.
 * Pointer events cover touch and mouse; `touch-action: pan-y` keeps vertical
 * scrolling native. Visual-only fallback stays the visible ✓ button.
 */
export function SwipeCard({
  children,
  onSwipeRight,
  threshold = 88,
}: {
  children: ReactNode;
  onSwipeRight: () => void;
  threshold?: number;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<'x' | 'y' | null>(null);
  const [dx, setDx] = useState(0);

  const progress = Math.min(1, dx / threshold);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    startX.current = e.clientX;
    startY.current = e.clientY;
    locked.current = null;
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const ddx = e.clientX - startX.current;
    const ddy = e.clientY - startY.current;
    if (locked.current === null) {
      if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) locked.current = 'x';
      else if (Math.abs(ddy) > 8) locked.current = 'y';
    }
    if (locked.current === 'x') setDx(Math.max(0, Math.min(ddx, 140)));
  }

  function onPointerUp() {
    if (dx > threshold) onSwipeRight();
    setDx(0);
    locked.current = null;
  }

  return (
    <div
      className="relative touch-pan-y overflow-hidden rounded-lg"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Completion cue behind the card, revealed by the drag */}
      <div
        className="bg-wash pointer-events-none absolute inset-0 flex items-center gap-2 pl-4 text-sm font-bold"
        style={{ opacity: progress * 0.95 }}
        aria-hidden
      >
        <span style={{ transform: `translateX(${dx * 0.4 - 16}px)` }}>✓</span>
      </div>
      <div
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? 'transform 200ms var(--chorify-motion-spring)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
