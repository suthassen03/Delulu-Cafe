import type { StockStatus } from "@/lib/inventory/alerts";

const CLASS_MAP: Record<StockStatus, string> = {
  OK: "badge-success",
  LOW: "badge-warning",
  CRITICAL: "badge-danger",
};

const LABEL_KEY: Record<StockStatus, string> = {
  OK: "inventory.ok",
  LOW: "inventory.low",
  CRITICAL: "inventory.critical",
};

export function statusBadgeClass(status: StockStatus) {
  return CLASS_MAP[status];
}
export function statusLabelKey(status: StockStatus) {
  return LABEL_KEY[status];
}
