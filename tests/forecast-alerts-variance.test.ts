import { describe, it, expect } from "vitest";
import { averageDailyUsage, daysRemaining, percentChange } from "@/lib/inventory/forecast";
import { evaluateIngredientAlerts } from "@/lib/inventory/alerts";
import { computeVariance } from "@/lib/inventory/variance";
import { recommendPurchaseQty, shouldRecommendPurchase } from "@/lib/inventory/purchasing";
import { computeProfitability } from "@/lib/inventory/profitability";

describe("forecast", () => {
  const now = new Date("2026-09-14T12:00:00Z");

  it("computes average daily usage over a trailing window", () => {
    const entries = [
      { quantity: -1.3, createdAt: new Date("2026-09-13T10:00:00Z") },
      { quantity: -1.1, createdAt: new Date("2026-09-12T10:00:00Z") },
      { quantity: 5, createdAt: new Date("2026-09-12T09:00:00Z") }, // purchase, ignored (positive)
      { quantity: -0.9, createdAt: new Date("2026-08-01T10:00:00Z") }, // outside window
    ];
    const avg = averageDailyUsage(entries, 7, now);
    expect(avg).toBeCloseTo((1.3 + 1.1) / 7);
  });

  it("spec §15 example: 4.2kg at 1.3kg/day ≈ 3.2 days", () => {
    expect(daysRemaining(4.2, 1.3)).toBeCloseTo(3.23, 1);
  });

  it("reports Infinity when usage is zero", () => {
    expect(daysRemaining(10, 0)).toBe(Infinity);
  });

  it("percentChange handles a zero baseline without dividing by zero", () => {
    expect(percentChange(5, 0)).toBe(100);
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe("alerts (spec §14)", () => {
  it("raises CRITICAL_STOCK once stock drops below half of minimum", () => {
    const alerts = evaluateIngredientAlerts({
      name: "Chicken Fillet",
      unit: "KG",
      currentStock: 2,
      minLevel: 5,
      daysRemaining: 10,
      recentUsage7d: 1,
      baselineUsage28d: 1,
      recentWasteWeek: 0,
      baselineWasteWeeklyAvg: 0,
    });
    expect(alerts.some((a) => a.type === "CRITICAL_STOCK")).toBe(true);
  });

  it("raises LOW_STOCK (not critical) between half-minimum and minimum", () => {
    const alerts = evaluateIngredientAlerts({
      name: "Coffee Beans",
      unit: "KG",
      currentStock: 1.2,
      minLevel: 2,
      daysRemaining: 2,
      recentUsage7d: 0.6,
      baselineUsage28d: 0.6,
      recentWasteWeek: 0,
      baselineWasteWeeklyAvg: 0,
    });
    expect(alerts.some((a) => a.type === "LOW_STOCK")).toBe(true);
    expect(alerts.some((a) => a.type === "CRITICAL_STOCK")).toBe(false);
  });

  it("raises CONSUMPTION_INCREASE when usage jumps 27% (spec example)", () => {
    const alerts = evaluateIngredientAlerts({
      name: "Oat Milk",
      unit: "L",
      currentStock: 8,
      minLevel: 5,
      daysRemaining: 20,
      recentUsage7d: 1.27,
      baselineUsage28d: 1.0,
      recentWasteWeek: 0,
      baselineWasteWeeklyAvg: 0,
    });
    expect(alerts.some((a) => a.type === "CONSUMPTION_INCREASE")).toBe(true);
  });

  it("raises UNUSUAL_WASTE when waste is 18% above the 4-week average (spec example)", () => {
    const alerts = evaluateIngredientAlerts({
      name: "Chicken",
      unit: "KG",
      currentStock: 10,
      minLevel: 2,
      daysRemaining: 20,
      recentUsage7d: 1,
      baselineUsage28d: 1,
      recentWasteWeek: 1.18,
      baselineWasteWeeklyAvg: 1.0,
    });
    expect(alerts.some((a) => a.type === "UNUSUAL_WASTE")).toBe(true);
  });

  it("raises nothing when stock and usage are all healthy", () => {
    const alerts = evaluateIngredientAlerts({
      name: "Tomatoes",
      unit: "KG",
      currentStock: 12,
      minLevel: 5,
      daysRemaining: 15,
      recentUsage7d: 0.8,
      baselineUsage28d: 0.8,
      recentWasteWeek: 0.1,
      baselineWasteWeeklyAvg: 0.1,
    });
    expect(alerts).toHaveLength(0);
  });
});

describe("stock count variance (spec §11)", () => {
  it("computes the worked example: expected 4.8kg, actual 4.1kg", () => {
    const v = computeVariance(4.8, 4.1, 1500);
    expect(v.difference).toBeCloseTo(-0.7);
    expect(v.percentDifference).toBeCloseTo(-14.58, 1);
    expect(v.estimatedLoss).toBeCloseTo(1050);
  });

  it("reports zero loss on a surplus", () => {
    const v = computeVariance(5, 5.5, 100);
    expect(v.estimatedLoss).toBe(0);
  });
});

describe("purchase recommendations (spec §17)", () => {
  it("recommends enough to cover lead time + safety buffer", () => {
    const qty = recommendPurchaseQty(1.2, 1.2, 3, 7);
    // needs (3+7)*1.2 = 12, has 1.2 -> 10.8
    expect(qty).toBeCloseTo(10.8);
  });

  it("recommends nothing when stock already covers the horizon", () => {
    expect(recommendPurchaseQty(50, 1, 3, 7)).toBe(0);
  });

  it("flags a purchase as urgent once days remaining is within lead time", () => {
    expect(shouldRecommendPurchase(1, 3)).toBe(true);
    expect(shouldRecommendPurchase(10, 3)).toBe(false);
  });
});

describe("profitability (spec §20)", () => {
  it("computes the Cappuccino worked example", () => {
    const result = computeProfitability(650, 165);
    expect(result.grossProfit).toBeCloseTo(485);
    expect(result.foodCostPct).toBeCloseTo(25.38, 1);
  });
});
