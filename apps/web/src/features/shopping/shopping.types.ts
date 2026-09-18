export type ShoppingItemPayload = {
  id: string;
  name: string;
  quantityText: string | null;
  purchasedAt: string | null;
  /** Manual drag order (D115): sparse decimals; null = pre-feature row. */
  sortKey: number | null;
};

/** Drag-to-reorder variables (D115): target position expressed by neighbors. */
export type ReorderItemVariables = {
  itemId: string;
  beforeItemId?: string | null;
  afterItemId?: string | null;
};
