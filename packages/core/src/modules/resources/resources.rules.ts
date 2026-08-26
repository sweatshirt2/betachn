import { AppError } from '../../errors';
import type { ActivityType } from '../../activity';
import type { SupplyState } from './resources.schema';

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
