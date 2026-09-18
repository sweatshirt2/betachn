"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CoachMark, type CoachStep } from "@/components/ui";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { hasSeenGuide, markGuideSeen } from "@/lib/device/guideFlag";

/**
 * First-comer guide (§16b / D114): the steps registry + auto-play hook.
 *
 * Laws it implements:
 * - micro-11/17: 3 steps anchored to REAL UI — the Today list (gestures),
 *   the universal + (create), and Pantry (supplies→shopping loop) —
 *   teaching the domain vocabulary in place, never a wall of text.
 * - Auto-plays ONCE on first signed-in load of a SYNCED household
 *   (server mode); device (offline-only) households skip — nothing to
 *   teach yet.
 * - micro-74: the completion flag (device DB) means it never re-nags;
 *   replay happens only from Settings ("How this works").
 *
 * Anchors: step 1 points at `coach-anchor-today-list` (rendered on the
 * Today page's list section); steps 2–3 target the shell FAB and the
 * Pantry nav tab, both stable chrome that exists on every layout.
 */
export const GUIDE_SEEN_EVENT = "chorify:guide-seen";

export function coachAnchorIds(): {
  todayList: string;
  createFab: string;
  pantryTab: string;
} {
  return {
    todayList: "coach-anchor-today-list",
    createFab: "coach-anchor-create-fab",
    pantryTab: "coach-anchor-pantry-tab",
  };
}

function useGuideSteps(): CoachStep[] {
  const { t } = useTranslation();
  const a = coachAnchorIds();
  return [
    {
      anchorId: a.todayList,
      title: t("coach.stepTodayTitle"),
      body: t("coach.stepTodayBody"),
    },
    {
      anchorId: a.createFab,
      title: t("coach.stepCreateTitle"),
      body: t("coach.stepCreateBody"),
    },
    {
      anchorId: a.pantryTab,
      title: t("coach.stepPantryTitle"),
      body: t("coach.stepPantryBody"),
    },
  ];
}

/**
 * One hook, two uses:
 * - `useCoachTour()` (default) — auto-play on the Today page for first
 *   comers in server mode; mount-and-forget.
 * - `useCoachTour({ replay: true })` — the Settings entry always shows
 *   the tour and re-arms the once-flag for the *next* fresh visitor on
 *   THIS device? No — replay never resets the flag (micro-74: no
 *   surprise re-triggers); it just plays the bubbles once more.
 */
export function useCoachTour(opts?: { replay?: boolean }): {
  active: boolean;
  stepIndex: number;
  steps: CoachStep[];
  next: () => void;
  dismiss: () => void;
  start: () => void;
} {
  const replay = opts?.replay ?? false;
  const mode = useSelector((state: RootState) => state.auth.mode);
  const steps = useGuideSteps();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current) return;
    // Device households and replay calls skip the auto-play check.
    if (mode !== "server" && !replay) {
      settled.current = true;
      return;
    }
    let cancelled = false;
    void (async () => {
      const seen = replay ? false : await hasSeenGuide();
      if (cancelled) return;
      settled.current = true;
      if (!seen) {
        setStepIndex(0);
        setActive(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, replay]);

  const finish = useCallback(() => {
    setActive(false);
    if (!replay) {
      void markGuideSeen();
      try {
        window.dispatchEvent(new CustomEvent(GUIDE_SEEN_EVENT));
      } catch {
        // non-fatal: the event only helps other tabs settle faster
      }
    }
  }, [replay]);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= steps.length - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, finish]);

  return {
    active,
    stepIndex,
    steps,
    next,
    dismiss: finish,
    start: useCallback(() => {
      setStepIndex(0);
      setActive(true);
    }, []),
  };
}

/** Renders the overlay when active — call once per page that hosts the tour. */
export function CoachTourOverlay(opts?: {
  replay?: boolean;
}): React.ReactElement | null {
  const tour = useCoachTour(opts);
  if (!tour.active) return null;
  return (
    <CoachMark
      steps={tour.steps}
      stepIndex={tour.stepIndex}
      onNext={tour.next}
      onDismiss={tour.dismiss}
    />
  );
}
