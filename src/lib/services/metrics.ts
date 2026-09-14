import { prisma } from "@/lib/prisma";
import { averageDailyUsage, daysRemaining } from "@/lib/inventory/forecast";
import { classifyStock, type StockStatus } from "@/lib/inventory/alerts";

export interface IngredientMetric {
  id: string;
  name: string;
  categoryName: string | null;
  unit: string;
  currentStock: number;
  minLevel: number;
  costPerUnit: number;
  supplierName: string | null;
  locationId: string;
  locationName: string;
  updatedAt: Date;
  avgDailyUsage14d: number;
  daysRemaining: number;
  recentUsage7d: number;
  baselineUsage28d: number;
  recentWasteWeek: number;
  baselineWasteWeeklyAvg: number;
  status: StockStatus;
}

/**
 * The single place that turns raw Ingredient + ledger rows into the metrics
 * every page needs (inventory table, dashboard KPIs, alerts, forecasting,
 * purchase suggestions, the AI assistant). Only SALE_CONSUMPTION and WASTE
 * ledger rows count as "usage" — purchases and manual/count adjustments
 * must never distort the forecast.
 */
export async function getIngredientMetrics(businessId: string, locationIds: string[]): Promise<IngredientMetric[]> {
  const ingredients = await prisma.ingredient.findMany({
    where: { businessId, locationId: { in: locationIds } },
    include: { definition: { include: { category: true } }, location: true, supplier: true },
    orderBy: { definition: { name: "asc" } },
  });
  if (ingredients.length === 0) return [];

  const since = new Date(Date.now() - 28 * 86_400_000);
  const txns = await prisma.inventoryTransaction.findMany({
    where: {
      ingredientId: { in: ingredients.map((i) => i.id) },
      type: { in: ["SALE_CONSUMPTION", "WASTE"] },
      createdAt: { gte: since },
    },
    select: { ingredientId: true, quantity: true, createdAt: true, type: true },
  });

  const byIngredient = new Map<string, typeof txns>();
  for (const t of txns) {
    if (!byIngredient.has(t.ingredientId)) byIngredient.set(t.ingredientId, []);
    byIngredient.get(t.ingredientId)!.push(t);
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

  return ingredients.map((ing) => {
    const entries = byIngredient.get(ing.id) ?? [];
    const consumption = entries.filter((e) => e.type === "SALE_CONSUMPTION");
    const waste = entries.filter((e) => e.type === "WASTE");

    const avgDailyUsage14d = averageDailyUsage(entries, 14, now);
    const recentUsage7d = averageDailyUsage(consumption, 7, now);
    // Trailing 21 days *before* the recent week, so the baseline reflects
    // "normal" usage rather than being diluted by the spike it's compared against.
    const baselineUsage28d = averageDailyUsage(consumption, 21, sevenDaysAgo);

    const recentWasteWeek = waste
      .filter((e) => e.createdAt >= sevenDaysAgo)
      .reduce((sum, e) => sum + Math.abs(e.quantity), 0);
    const priorWasteTotal = waste
      .filter((e) => e.createdAt < sevenDaysAgo)
      .reduce((sum, e) => sum + Math.abs(e.quantity), 0);
    const baselineWasteWeeklyAvg = priorWasteTotal / 3; // trailing weeks 2-4

    return {
      id: ing.id,
      name: ing.definition.name,
      categoryName: ing.definition.category?.name ?? null,
      unit: ing.definition.unit,
      currentStock: ing.currentStock,
      minLevel: ing.minLevel,
      costPerUnit: ing.costPerUnit,
      supplierName: ing.supplier?.name ?? null,
      locationId: ing.locationId,
      locationName: ing.location.name,
      updatedAt: ing.updatedAt,
      avgDailyUsage14d,
      daysRemaining: daysRemaining(ing.currentStock, avgDailyUsage14d),
      recentUsage7d,
      baselineUsage28d,
      recentWasteWeek,
      baselineWasteWeeklyAvg,
      status: classifyStock(ing.currentStock, ing.minLevel),
    };
  });
}

export async function getIngredientMetricById(ingredientId: string): Promise<IngredientMetric | null> {
  const ing = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
  if (!ing) return null;
  const all = await getIngredientMetrics(ing.businessId, [ing.locationId]);
  return all.find((m) => m.id === ingredientId) ?? null;
}
