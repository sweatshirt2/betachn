'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Pull-to-refresh (§5.3 / D115): touch-only downward over-pull at the top
 * of a scroll container triggers onRefresh. The threshold commit rides the
 * SAME refresh path as any visible retry control (one write path). Rubber-
 * band resist keeps the pull physical; server sessions simply refetch
 * queries, device sessions flush the sync engine first.
 */

const PULL_THRESHOLD = 72;
const MAX_PULL = 120;

export function usePullToRefresh(onRefresh: () => void | Promise<void>): {
  pull: number;
  refreshing: boolean;
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
  };
} {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch') return;
    // Only engage when the page is at (or beyond) the top — otherwise the
    // gesture would fight normal upward scrolling.
    const scroller = e.currentTarget.closest('[data-ptr-root]') ?? e.currentTarget;
    if (scroller.scrollTop > 0 && scroller.scrollTop !== undefined) {
      const atTop =
        scroller.scrollTop <= 0 ||
        (e.currentTarget.parentElement?.scrollTop ?? 0) <= 0 ||
        window.scrollY <= 0;
      if (!atTop) return;
    }
    startY.current = e.clientY;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (startY.current === null || refreshing) return;
    const delta = e.clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    const resisted = delta > MAX_PULL ? MAX_PULL + (delta - MAX_PULL) * 0.25 : delta;
    setPull(Math.min(resisted, MAX_PULL * 1.3));
  };

  const onPointerUp = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(PULL_THRESHOLD * 0.5);
      void Promise.resolve(onRefresh()).finally(() => {
        setRefreshing(false);
        setPull(0);
      });
    } else {
      setPull(0);
    }
  };

  return {
    pull,
    refreshing,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
