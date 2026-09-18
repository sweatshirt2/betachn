'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * Two-direction gesture wrapper (§5.3, CN micro-6 + D115): TOUCH-ONLY
 * accelerant — visible buttons remain the primary affordance and desktop
 * pointers never trigger swipes. Swipe right → growing green wash + ✓ cue
 * commits onSwipeRight; swipe left → skip cue behind the row commits
 * onSwipeLeft. 60%-of-track threshold with rubber-band past the limit;
 * pan-y keeps vertical scrolling native; reduced-motion drops the travel
 * spring. Commits ride the same mutation hooks as the buttons — one write
 * path, sync/idempotency untouched.
 */

const MAX_TRAVEL = 140;
/** Fraction of the threshold distance at which the drag commits. */
const COMMIT_RATIO = 0.6;

export function SwipeCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  threshold = 88,
}: {
  children: ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  threshold?: number;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<'x' | 'y' | null>(null);
  const touchOnly = useRef(false);
  const [dx, setDx] = useState(0);

  const rightProgress = Math.min(1, dx / threshold);
  const leftProgress = Math.min(1, -dx / threshold);
  const commitAt = threshold * COMMIT_RATIO;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // D115: swipes are a touch accelerant; mouse/desktop keeps buttons.
    touchOnly.current = e.pointerType === 'touch';
    if (!touchOnly.current) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    locked.current = null;
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!touchOnly.current) return;
    const ddx = e.clientX - startX.current;
    const ddy = e.clientY - startY.current;
    if (locked.current === null) {
      if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) locked.current = 'x';
      else if (Math.abs(ddy) > 8) locked.current = 'y';
    }
    if (locked.current === 'x') {
      // Rubber-band: resist past the travel limit instead of hard-clamping.
      const raw = Math.max(-MAX_TRAVEL * 1.4, Math.min(ddx, MAX_TRAVEL * 1.4));
      const resisted =
        Math.abs(raw) > MAX_TRAVEL
          ? Math.sign(raw) * (MAX_TRAVEL + (Math.abs(raw) - MAX_TRAVEL) * 0.3)
          : raw;
      setDx(resisted);
    }
  }

  function onPointerUp() {
    if (!touchOnly.current) return;
    if (dx > commitAt && onSwipeRight) onSwipeRight();
    else if (-dx > commitAt && onSwipeLeft) onSwipeLeft();
    setDx(0);
    locked.current = null;
    touchOnly.current = false;
  }

  // Reduced motion: no mid-drag travel — the cue wash still fades in and the
  // commit happens on release (the action itself is never motion-gated).
  const reduced = typeof window !== 'undefined' && prefersReducedMotion();
  const travel = reduced ? 0 : dx;

  return (
    <div
      className="relative touch-pan-y overflow-hidden rounded-lg"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Completion cue behind the card, revealed by the right drag */}
      {onSwipeRight && (
        <div
          className="bg-wash pointer-events-none absolute inset-0 flex items-center gap-2 pl-4 text-sm font-bold"
          style={{ opacity: rightProgress * 0.95 }}
          aria-hidden
        >
          <span style={{ transform: `translateX(${travel * 0.4 - 16}px)` }}>✓</span>
        </div>
      )}
      {/* Skip cue behind the card, revealed by the left drag (D115) */}
      {onSwipeLeft && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-end gap-2 pr-4 text-sm font-bold"
          style={{ opacity: leftProgress * 0.95, background: 'var(--chorify-danger-soft)' }}
          aria-hidden
        >
          <span style={{ transform: `translateX(${-travel * 0.4 + 16}px)` }}>—</span>
        </div>
      )}
      <div
        style={{
          transform: `translateX(${travel}px)`,
          transition: dx === 0 ? 'transform 200ms var(--chorify-motion-spring)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
