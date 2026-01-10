export const ITEM_STATUS = {
  PENDING: "pending",
  BOUGHT: "bought",
  DELIVERED: "delivered",
} as const;

export type ItemStatus = (typeof ITEM_STATUS)[keyof typeof ITEM_STATUS];
