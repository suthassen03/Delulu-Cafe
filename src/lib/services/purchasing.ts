import { prisma } from "@/lib/prisma";
import { getIngredientMetrics } from "@/lib/services/metrics";
import { recommendPurchaseQty, shouldRecommendPurchase } from "@/lib/inventory/purchasing";

export interface PurchaseSuggestion {
  ingredientId: string;
  name: string;
  unit: string;
  currentStock: number;
  daysRemaining: number;
  recommendedQty: number;
  leadTimeDays: number;
  supplierName: string | null;
  reason: string;
}

/** Spec §17 — real purchase recommendations, derived from actual usage + lead time. */
export async function getPurchaseSuggestions(businessId: string, locationIds: string[]): Promise<PurchaseSuggestion[]> {
  const [metrics, ingredients] = await Promise.all([
    getIngredientMetrics(businessId, locationIds),
    prisma.ingredient.findMany({
      where: { businessId, locationId: { in: locationIds } },
      include: { supplier: true },
    }),
  ]);
  const supplierByIngredient = new Map(ingredients.map((i) => [i.id, i.supplier]));

  const suggestions: PurchaseSuggestion[] = [];
  for (const m of metrics) {
    const supplier = supplierByIngredient.get(m.id);
    const leadTimeDays = supplier?.leadTimeDays ?? 3;
    if (!shouldRecommendPurchase(m.daysRemaining, leadTimeDays) && m.currentStock > m.minLevel) continue;

    const qty = recommendPurchaseQty(m.currentStock, m.avgDailyUsage14d, leadTimeDays, 7);
    if (qty <= 0 && m.currentStock > m.minLevel) continue;

    const finalQty = qty > 0 ? qty : Math.max(m.minLevel * 1.5 - m.currentStock, m.minLevel);
    suggestions.push({
      ingredientId: m.id, name: m.name, unit: m.unit, currentStock: m.currentStock,
      daysRemaining: m.daysRemaining, recommendedQty: Math.round(finalQty * 100) / 100,
      leadTimeDays, supplierName: supplier?.name ?? null,
      reason: Number.isFinite(m.daysRemaining)
        ? `Expected to run out within ${Math.max(0, Math.round(m.daysRemaining))} day(s).`
        : "Below minimum stock level.",
    });
  }
  return suggestions.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
