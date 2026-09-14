import { notFound } from "next/navigation";
import { requireSection, resolveActiveLocationId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ingredientCostPerUnit } from "@/lib/inventory/recipe";
import { computeProfitability } from "@/lib/inventory/profitability";
import { RecipeEditorClient } from "@/components/recipes/RecipeEditorClient";
import type { Role, UnitCode } from "@/lib/enums";

export default async function RecipeEditorPage({ params }: { params: { id: string } }) {
  const session = await requireSection("recipes");
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { recipe: { include: { definition: { include: { category: true } } } } },
  });
  if (!product || product.businessId !== session.user.businessId) notFound();

  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const pricingLocationId = activeLocationId === "ALL" ? allLocations[0]?.id : activeLocationId;

  const [definitions, stockRows] = await Promise.all([
    prisma.ingredientDefinition.findMany({ where: { businessId: session.user.businessId }, orderBy: { name: "asc" } }),
    prisma.ingredient.findMany({ where: { locationId: pricingLocationId } }),
  ]);
  const costByDefinition = new Map(stockRows.map((s) => [s.definitionId, s.costPerUnit]));

  const lines = product.recipe.map((r) => ({
    ingredientId: r.definitionId,
    quantity: r.quantity,
    unit: r.unit as UnitCode,
    ingredientUnit: r.definition.unit as UnitCode,
    ingredientPackSize: r.definition.packSize,
    costPerUnit: costByDefinition.get(r.definitionId) ?? 0,
  }));
  const ingredientCost = ingredientCostPerUnit(lines, product.prepWastePct);
  const profitability = computeProfitability(product.price, ingredientCost);

  return (
    <RecipeEditorClient
      product={product}
      definitions={definitions}
      ingredientCost={ingredientCost}
      profitability={profitability}
    />
  );
}
