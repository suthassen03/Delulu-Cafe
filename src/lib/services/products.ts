import { prisma } from "@/lib/prisma";
import { ingredientCostPerUnit } from "@/lib/inventory/recipe";
import { computeProfitability } from "@/lib/inventory/profitability";
import type { UnitCode } from "@/lib/enums";

/**
 * Product list with live food-cost/profitability, costed against one
 * "pricing location" (ingredient costs can differ by location/supplier —
 * for a combined "ALL locations" view we cost against the business's first
 * location, noted in the UI).
 */
export async function getProductsWithProfitability(businessId: string, pricingLocationId: string) {
  const products = await prisma.product.findMany({
    where: { businessId },
    include: { recipe: { include: { definition: true } } },
    orderBy: { name: "asc" },
  });

  const definitionIds = Array.from(new Set(products.flatMap((p) => p.recipe.map((r) => r.definitionId))));
  const stockRows = await prisma.ingredient.findMany({
    where: { locationId: pricingLocationId, definitionId: { in: definitionIds } },
  });
  const costByDefinition = new Map(stockRows.map((s) => [s.definitionId, s.costPerUnit]));

  return products.map((p) => {
    const lines = p.recipe.map((r) => ({
      ingredientId: r.definitionId,
      quantity: r.quantity,
      unit: r.unit as UnitCode,
      ingredientUnit: r.definition.unit as UnitCode,
      ingredientPackSize: r.definition.packSize,
      costPerUnit: costByDefinition.get(r.definitionId) ?? 0,
    }));
    const ingredientCost = ingredientCostPerUnit(lines, p.prepWastePct);
    const { grossProfit, foodCostPct } = computeProfitability(p.price, ingredientCost);
    return {
      id: p.id, name: p.name, price: p.price, prepWastePct: p.prepWastePct, available: p.available,
      ingredientCount: p.recipe.length, ingredientCost, grossProfit, foodCostPct,
    };
  });
}
