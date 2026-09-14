import { percentChange } from "@/lib/inventory/forecast";
import type { AlertSeverity, AlertType } from "@/lib/enums";

export interface AlertCandidate {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
}

export interface IngredientAlertMetrics {
  name: string;
  unit: string;
  currentStock: number;
  minLevel: number;
  daysRemaining: number; // Infinity if usage ~0
  recentUsage7d: number; // avg daily usage, last 7 days
  baselineUsage28d: number; // avg daily usage, trailing 28 days (excluding the most recent 7)
  recentWasteWeek: number; // total waste qty, last 7 days
  baselineWasteWeeklyAvg: number; // avg weekly waste qty, trailing 4 weeks (excluding the most recent week)
}

const CONSUMPTION_INCREASE_THRESHOLD_PCT = 20;
const UNUSUAL_WASTE_THRESHOLD_PCT = 15;
const RUNOUT_FORECAST_DAYS = 2;

export type StockStatus = "OK" | "LOW" | "CRITICAL";

/** Same thresholds evaluateIngredientAlerts uses — the single source of truth for stock badges. */
export function classifyStock(currentStock: number, minLevel: number): StockStatus {
  if (currentStock <= minLevel * 0.5) return "CRITICAL";
  if (currentStock <= minLevel) return "LOW";
  return "OK";
}

/** Pure rule engine — spec §14. Returns 0+ candidate alerts for one ingredient. */
export function evaluateIngredientAlerts(m: IngredientAlertMetrics): AlertCandidate[] {
  const candidates: AlertCandidate[] = [];
  const qty = (n: number) => `${Math.round(n * 100) / 100} ${m.unit.toLowerCase()}`;

  if (m.currentStock <= m.minLevel * 0.5) {
    candidates.push({
      type: "CRITICAL_STOCK",
      severity: "CRITICAL",
      message: `${m.name} is below minimum stock level. Current stock: ${qty(m.currentStock)} (minimum ${qty(m.minLevel)}).`,
    });
  } else if (m.currentStock <= m.minLevel) {
    candidates.push({
      type: "LOW_STOCK",
      severity: "WARNING",
      message: `${m.name} current stock: ${qty(m.currentStock)}. Expected to run out in approximately ${
        Number.isFinite(m.daysRemaining) ? Math.max(0, Math.round(m.daysRemaining)) : "several"
      } days.`,
    });
  }

  if (Number.isFinite(m.daysRemaining) && m.daysRemaining <= RUNOUT_FORECAST_DAYS && m.currentStock > m.minLevel * 0.5) {
    candidates.push({
      type: "RUNOUT_FORECAST",
      severity: m.daysRemaining <= 1 ? "CRITICAL" : "WARNING",
      message: `${m.name} is expected to run out within ${Math.max(0, Math.round(m.daysRemaining))} day(s) at current usage.`,
    });
  }

  const usageChange = percentChange(m.recentUsage7d, m.baselineUsage28d);
  if (usageChange >= CONSUMPTION_INCREASE_THRESHOLD_PCT) {
    candidates.push({
      type: "CONSUMPTION_INCREASE",
      severity: "INFO",
      message: `${m.name} usage increased ${Math.round(usageChange)}% compared with normal consumption.`,
    });
  }

  const wasteChange = percentChange(m.recentWasteWeek, m.baselineWasteWeeklyAvg);
  if (wasteChange >= UNUSUAL_WASTE_THRESHOLD_PCT && m.recentWasteWeek > 0) {
    candidates.push({
      type: "UNUSUAL_WASTE",
      severity: "WARNING",
      message: `${m.name} waste is ${Math.round(wasteChange)}% higher than the trailing 4-week average.`,
    });
  }

  return candidates;
}
