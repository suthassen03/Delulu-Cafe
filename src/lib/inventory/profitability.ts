export interface ProfitabilityResult {
  ingredientCost: number;
  grossProfit: number;
  foodCostPct: number;
}

/** Spec §20: gross contribution and food-cost % for one unit of a menu product. */
export function computeProfitability(sellingPrice: number, ingredientCost: number): ProfitabilityResult {
  const grossProfit = sellingPrice - ingredientCost;
  const foodCostPct = sellingPrice > 0 ? (ingredientCost / sellingPrice) * 100 : 0;
  return { ingredientCost, grossProfit, foodCostPct };
}
