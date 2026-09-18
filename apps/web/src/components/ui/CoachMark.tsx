"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";

/**
 * CoachMark — the first-comer guide primitive (§16b / D114).
 *
 * A fixed overlay that spotlights a REAL UI element by `anchorId` and floats
 * a bubble next to it. Laws it enforces:
 * - micro-11/17: bubbles teach IN PLACE — short title + one sentence, never
 *   a wall-of-text tour; each step carries its own progress dot.
 * - "Skip" is always visible; tapping the dark backdrop dismisses too
 *   (the tour is an invitation, never a trap).
 * - micro-74: never re-nags — the caller owns the once-flag (device DB) and
 *   re-plays only from Settings.
 * - Reduced-motion respected via the existing motion utilities (transition
 *   only; no confetti-grade theatrics).
 *
 * Anchoring is deliberately simple (getBoundingClientRect at step start +
 * window resize re-measure) — coach marks run once, on calm screens, so a
 * full popper engine would be weight without benefit.
 */
export type CoachStep = {
  /** DOM id of the element to spotlight (must exist on the current page). */
  anchorId: string;
  title: string;
  body: string;
  /** Which side of the anchor the bubble prefers. Default 'bottom'. */
  side?: "top" | "bottom" | "left" | "right";
};

export function CoachMark({
  steps,
  stepIndex,
  onNext,
  onDismiss,
}: {
  steps: CoachStep[];
  stepIndex: number;
  onNext: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const step = steps[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!step) return;
    const measure = () => {
      const el = document.getElementById(step.anchorId);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  if (!mounted || !step) return null;

  const isLast = stepIndex === steps.length - 1;
  const side = step.side ?? "bottom";

  // Bubble position: anchor-aware with viewport clamping via transform-free
  // math (clamp within 8px gutters; fall back to centered when unmeasured).
  const gutter = 8;
  const bubbleW = 272;
  let top: number | undefined;
  let left: number | undefined;
  if (rect) {
    if (side === "bottom") {
      top = rect.bottom + gutter;
      left = Math.min(
        Math.max(gutter, rect.left + rect.width / 2 - bubbleW / 2),
        window.innerWidth - bubbleW - gutter,
      );
    } else if (side === "top") {
      top = Math.max(gutter, rect.top - gutter - 132);
      left = Math.min(
        Math.max(gutter, rect.left + rect.width / 2 - bubbleW / 2),
        window.innerWidth - bubbleW - gutter,
      );
    } else if (side === "left") {
      top = rect.top;
      left = Math.max(gutter, rect.left - bubbleW - gutter);
    } else {
      top = rect.top;
      left = Math.min(
        rect.right + gutter,
        window.innerWidth - bubbleW - gutter,
      );
    }
    if (top !== undefined) top = Math.min(top, window.innerHeight - 140);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {/* Dark veil with a transparent hole over the anchor — four shaded
          strips so the real UI stays visible and touchable-looking. */}
      {rect ? (
        <>
          <div
            className="absolute inset-x-0 top-0 bg-ink/55"
            style={{ height: Math.max(0, rect.top) }}
          />
          <div
            className="absolute inset-x-0 bg-ink/55"
            style={{ top: rect.bottom, bottom: 0 }}
          />
          <div
            className="absolute bg-ink/55"
            style={{
              top: rect.top,
              height: rect.height,
              left: 0,
              width: Math.max(0, rect.left),
            }}
          />
          <div
            className="absolute bg-ink/55"
            style={{
              top: rect.top,
              height: rect.height,
              left: rect.right,
              right: 0,
            }}
          />
          {/* Soft ring around the anchor */}
          <div
            className="pointer-events-none absolute rounded-xl border-2 border-white/80"
            style={{
              top: rect.top - 4,
              left: rect.left - 4,
              width: rect.width + 8,
              height: rect.height + 8,
            }}
          />
        </>
      ) : (
        <button
          className="absolute inset-0 bg-ink/55"
          onClick={onDismiss}
          aria-label={t("common.close")}
          tabIndex={-1}
        />
      )}

      {/* Backdrop dismiss + advance: tapping anywhere outside the bubble
          moves forward (or dismisses on the last step). */}
      <button
        className="absolute inset-0"
        onClick={isLast ? onDismiss : onNext}
        aria-label={t("common.close")}
        tabIndex={-1}
      />

      {rect && (
        <div
          className="bg-card-wash text-ink shadow-lift border-line absolute w-[17rem] rounded-xl border p-4"
          style={{ top, left, maxWidth: bubbleW }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5" aria-hidden>
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i === stepIndex ? "bg-ink" : "bg-ink/25"}`}
                />
              ))}
            </div>
            <button
              className="text-muted text-xs font-semibold underline"
              onClick={onDismiss}
            >
              {t("coach.skip")}
            </button>
          </div>
          <h3 className="font-display mt-2 text-lg leading-snug">
            {step.title}
          </h3>
          <p className="text-muted mt-1 text-sm">{step.body}</p>
          <div className="mt-3 flex justify-end">
            <Button onClick={isLast ? onDismiss : onNext}>
              {isLast ? t("coach.done") : t("coach.next")}
            </Button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
