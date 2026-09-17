import { AppError } from '../../errors';
import type { ActivityType } from '../../activity';
import type { SupplyEventType, SupplyState } from './resources.schema';

export type SupplyActivityType = 'supply.low' | 'supply.out';

/**
 * §6.11: activity fires ONLY when a supply ENTERS low/out. Entering
 * 'available' (restock) is silent — the purchase flow tells that story.
 */
export function supplyActivityType(nextState: SupplyState): SupplyActivityType | null {
  switch (nextState) {
    case 'low':
      return 'supply.low';
    case 'out':
      return 'supply.out';
    default:
      return null;
  }
}

/** Shape purchase idempotency needs — satisfied by shopping_items rows. */
export interface PurchaseCheck {
  purchasedAt: Date | null;
}

export function purchaseGuard(item: PurchaseCheck): void {
  if (item.purchasedAt !== null) throw new AppError('CONFLICT', 'Already purchased');
}

/** Compile-time proof every emitted type stays inside the frozen catalog. */
const _catalogCheck: Record<SupplyActivityType, ActivityType> = {
  'supply.low': 'supply.low',
  'supply.out': 'supply.out',
};
void _catalogCheck;

// ————————————————————————————————————————————————————————
// Supply event log + consumption cycles (§4A.1 / D102)
// ————————————————————————————————————————————————————————

/** The event type a transition INTO `nextState` produces. Pure, no I/O. */
export function supplyEventTypeForTransition(nextState: SupplyState): SupplyEventType {
  switch (nextState) {
    case 'low':
      return 'marked_low';
    case 'out':
      return 'marked_out';
    default:
      return 'restocked';
  }
}

/** Minimal event shape the cycle engine consumes (device rows satisfy it too). */
export interface SupplyEventLike {
  type: SupplyEventType;
  occurredAt: Date;
}

export interface SupplyCycleStats {
  /** Completed restock→low/out→restock cycles observed. */
  cycleCount: number;
  avgCycleDays: number | null;
  lastCycleDays: number | null;
  outCount30d: number;
  outCount90d: number;
  lowCount90d: number;
}

const DAY_MS = 24 * 3600 * 1000;

/**
 * Derives consumption facts from the event log (D102): a cycle is
 * restock (or creation) → next low/out → next restock. Cycle length = the
 * interval BETWEEN restocks — the only unit that matters to a household
 * ("how long does one buy last"). Missing restock bookends yield null
 * cycle stats; counts stay computable from any history window.
 */
export function computeSupplyCycleStats(
  events: SupplyEventLike[],
  now: Date,
): SupplyCycleStats {
  const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const restocks = sorted.filter((e) => e.type === 'restocked' || e.type === 'created');
  const lows = sorted.filter((e) => e.type === 'marked_low');
  const outs = sorted.filter((e) => e.type === 'marked_out');

  const cycleDays: number[] = [];
  for (let i = 1; i < restocks.length; i++) {
    const span = (restocks[i]!.occurredAt.getTime() - restocks[i - 1]!.occurredAt.getTime()) / DAY_MS;
    // Discard implausible bookends (clock jumps, pre-history imports) —
    // a cycle longer than 2 years is noise, not consumption.
    if (span > 0 && span <= 730) cycleDays.push(span);
  }

  const within = (event: SupplyEventLike, days: number) =>
    now.getTime() - event.occurredAt.getTime() <= days * DAY_MS;

  const cycleCount = cycleDays.length;
  const sum = cycleDays.reduce((acc, d) => acc + d, 0);
  return {
    cycleCount,
    avgCycleDays: cycleCount > 0 ? sum / cycleCount : null,
    lastCycleDays: cycleCount > 0 ? cycleDays[cycleCount - 1]! : null,
    outCount30d: outs.filter((e) => within(e, 30)).length,
    outCount90d: outs.filter((e) => within(e, 90)).length,
    lowCount90d: lows.filter((e) => within(e, 90)).length,
  };
}

/**
 * D108 gate for the recurring-buy suggestion: a suggestion only appears
 * once ≥2 completed cycles exist and the average sits in a sane range.
 */
export function suggestibleCycle(stats: SupplyCycleStats): boolean {
  return (
    stats.cycleCount >= 2 &&
    stats.avgCycleDays !== null &&
    stats.avgCycleDays >= 3 &&
    stats.avgCycleDays <= 365
  );
}

/**
 * Recurring reminder state machine (§4A.3 / D108–D110) — pure, tested.
 * Reminders only: nothing here assumes a purchase happened or adds to the
 * list by itself (micro-74). `onList` = an OPEN (unpurchased) shopping item
 * exists linked to this reminder's supply or matching its name.
 */
export type RecurringStateKind = 'idle' | 'due' | 'snoozed' | 'onList' | 'overdue';

export interface RecurringItemLike {
  intervalDays: number;
  lastPurchaseAt: Date | null;
  snoozedUntil: Date | null;
  state: 'active' | 'paused';
}

export function computeRecurringState(
  item: RecurringItemLike,
  now: Date,
  openListItemExists: boolean,
): RecurringStateKind {
  if (item.state === 'paused') return 'idle';
  if (openListItemExists) return 'onList';
  if (item.lastPurchaseAt === null) return 'due'; // never bought through the flow yet
  if (item.snoozedUntil !== null && now.getTime() < item.snoozedUntil.getTime()) return 'snoozed';
  const elapsedDays = Math.floor((now.getTime() - item.lastPurchaseAt.getTime()) / 86_400_000);
  if (elapsedDays < item.intervalDays) return 'idle';
  return elapsedDays === item.intervalDays ? 'due' : 'overdue';
}

/** Gentle overdue text input (micro-45) — days, never an alarm state. */
export function recurringOverdueDays(item: RecurringItemLike, now: Date): number {
  if (item.lastPurchaseAt === null) return 0;
  return Math.max(0, Math.floor((now.getTime() - item.lastPurchaseAt.getTime()) / 86_400_000) - item.intervalDays);
}
