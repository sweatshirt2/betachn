'use client';

import confetti from 'canvas-confetti';

/** §5.3 motion respects the OS reduced-motion setting everywhere. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Tiny haptic tick on check-off (§5.3) — no-op where unsupported. */
export function buzz(): void {
  if (prefersReducedMotion()) return;
  navigator.vibrate?.(10);
}

/**
 * Check-off confetti burst (§5.3). Colors resolve from the live theme tokens
 * so every theme (family/ember/highland) bursts in its own palette.
 */
export function celebrateChore(): void {
  if (prefersReducedMotion()) return;
  const styles = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  const colors = [
    pick('--chorify-primary', '#c96f4a'),
    pick('--chorify-secondary', '#7a8b6f'),
    pick('--chorify-accent', '#e3b23c'),
  ];
  void confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 32,
    origin: { y: 0.7 },
    colors,
    disableForReducedMotion: true,
  });
}

