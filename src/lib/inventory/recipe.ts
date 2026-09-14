import { convert } from "@/lib/inventory/units";
import type { UnitCode } from "@/lib/enums";

export interface RecipeLine {
  ingredientId: string;
  quantity: number; // per single unit of product, in `unit`
  unit: UnitCode;
  ingredientUnit: UnitCode;
  ingredientPackSize?: number | null;
}

export interface ConsumptionLine {
  ingredientId: string;
  /** Quantity to deduct, expressed in the ingredient's own stock unit. */
  quantity: number;
}

/**
 * Explodes N units of a product's recipe into per-ingredient consumption,
 * expressed in each ingredient's own stock unit, applying the product's
 * preparation-waste percentage on top of the raw recipe amount.
 *
 * Example (spec §7): Cappuccino = 18 g coffee + 250 ml milk. Selling 2
 * Cappuccinos consumes 36 g coffee + 500 ml milk.
 */
export function explodeRecipe(
  lines: RecipeLine[],
  quantitySold: number,
  prepWastePct = 0
): ConsumptionLine[] {
  const wasteFactor = 1 + prepWastePct / 100;
  return lines.map((line) => {
    const rawQty = line.quantity * quantitySold * wasteFactor;
    const qtyInIngredientUnit = convert(rawQty, line.unit, line.ingredientUnit, line.ingredientPackSize);
    return { ingredientId: line.ingredientId, quantity: qtyInIngredientUnit };
  });
}

export interface IngredientCostInput extends RecipeLine {
  costPerUnit: number; // LKR per ingredientUnit
}

/**
 * Ingredient cost for one unit of the product (spec §20), accounting for
 * prep waste — the cost basis restaurants actually pay for.
 */
export function ingredientCostPerUnit(lines: IngredientCostInput[], prepWastePct = 0): number {
  const wasteFactor = 1 + prepWastePct / 100;
  return lines.reduce((sum, line) => {
    const qtyInIngredientUnit = convert(line.quantity, line.unit, line.ingredientUnit, line.ingredientPackSize);
    return sum + qtyInIngredientUnit * wasteFactor * line.costPerUnit;
  }, 0);
}
