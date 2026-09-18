'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Long-press gesture (§5.3 / D115): fires after HOLD_MS of sustained touch,
 * cancelled by movement (> MOVE_TOLERANCE px) or early release — power
 * without added chrome. Touch-only per D115 (desktop keeps visible
 * buttons); haptic tick on fire. Returns flag + spreadable handlers so the
 * row can dim/underline while the press builds.
 */

const HOLD_MS = 500;
const MOVE_TOLERANCE = 10;

export function useLongPress(onLongPress: () => void): {
  pressing: boolean;
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
  };
} {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [pressing, setPressing] = useState(false);

  const clear = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch') return;
    origin.current = { x: e.clientX, y: e.clientY };
    setPressing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setPressing(false);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10);
      onLongPress();
    }, HOLD_MS);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (timer.current === null) return;
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    if (dx * dx + dy * dy > MOVE_TOLERANCE * MOVE_TOLERANCE) clear();
  };

  return {
    pressing,
    handlers: { onPointerDown, onPointerMove, onPointerUp: clear, onPointerLeave: clear },
  };
}
