// Canonical value lists for the string-typed "enum" fields in prisma/schema.prisma
// (SQLite has no native enum support in Prisma, so these are validated at the
// application boundary instead). Keep this file in sync with the schema
// comments.

export const ROLES = ["OWNER", "MANAGER", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const UNITS = ["G", "KG", "ML", "L", "PCS", "PACK", "BOX"] as const;
export type UnitCode = (typeof UNITS)[number];

export const PURCHASE_STATUSES = ["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const SALE_SOURCES = ["MANUAL", "POS", "API", "CSV"] as const;
export type SaleSource = (typeof SALE_SOURCES)[number];

export const WASTE_REASONS = [
  "EXPIRED",
  "SPOILED",
  "DROPPED",
  "OVERPRODUCTION",
  "PREPARATION_WASTE",
  "INCORRECT_ORDER",
  "DAMAGED",
  "UNKNOWN",
  "OTHER",
] as const;
export type WasteReason = (typeof WASTE_REASONS)[number];

export const STOCK_COUNT_STATUSES = ["IN_PROGRESS", "COMPLETED"] as const;
export type StockCountStatus = (typeof STOCK_COUNT_STATUSES)[number];

export const TRANSACTION_TYPES = [
  "PURCHASE",
  "SALE_CONSUMPTION",
  "WASTE",
  "STOCK_ADJUSTMENT",
  "STOCK_COUNT",
  "TRANSFER",
  "RETURN",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const ALERT_TYPES = [
  "LOW_STOCK",
  "CRITICAL_STOCK",
  "RUNOUT_FORECAST",
  "CONSUMPTION_INCREASE",
  "UNUSUAL_WASTE",
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL", "PUSH", "WHATSAPP"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  OWNER: [
    "dashboard", "inventory", "recipes", "sales", "purchases", "waste",
    "reports", "alerts", "ai", "users", "settings", "stock-count",
  ],
  MANAGER: [
    "dashboard", "inventory", "recipes", "purchases", "waste", "reports",
    "alerts", "stock-count", "sales", "ai",
  ],
  EMPLOYEE: ["dashboard", "inventory", "stock-count", "waste", "alerts"],
};

export function can(role: Role, section: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(section) ?? false;
}
