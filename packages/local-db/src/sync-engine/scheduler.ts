import type { SyncEngine } from './engine';

const TICK_MS = 30_000;
const FLUSH_DEBOUNCE_MS = 500;

/** Trigger sources for the flusher (§4.12): write ack, reconnect, focus, tick. */
export type FlushTrigger = 'write' | 'online' | 'focus' | 'interval' | 'manual';

export interface SchedulerTimers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
  /** Registers a DOM event; returns the unregister fn. No-op in tests. */
  addEventListener?(
    event: 'online' | 'offline' | 'focus' | 'visibilitychange',
    fn: () => void,
  ): () => void;
}

/**
 * Coalescing flusher: any trigger schedules ONE debounced flush; triggers
 * arriving mid-flush reschedule afterwards instead of stacking runs.
 */
export class FlushScheduler {
  private handle: unknown = null;

  constructor(
    private readonly engine: SyncEngine,
    private readonly timers: SchedulerTimers,
    private readonly intervalMs: number = TICK_MS,
    private readonly debounceMs: number = FLUSH_DEBOUNCE_MS,
  ) {}

  schedule(_reason: FlushTrigger): void {
    if (this.handle !== null) return; // already pending — coalesce
    this.handle = this.timers.setTimeout(() => {
      this.handle = null;
      this.run();
    }, this.debounceMs);
  }

  private run(): void {
    this.engine
      .flush()
      .catch(() => this.schedule('interval')); // network hiccup → retry next tick path
  }

  /** Foreground lifecycle wiring — call once from the app bootstrap. */
  start(): () => void {
    const interval = this.timers.setInterval(() => this.schedule('interval'), this.intervalMs);
    const unregisters: Array<() => void> = [];
    if (this.timers.addEventListener) {
      for (const event of ['online', 'focus', 'visibilitychange'] as const) {
        unregisters.push(
          this.timers.addEventListener(event, () => this.schedule('online')),
        );
      }
    }
    return () => {
      this.timers.clearInterval(interval);
      for (const unregister of unregisters) unregister();
      if (this.handle !== null) this.timers.clearTimeout(this.handle);
    };
  }
}
