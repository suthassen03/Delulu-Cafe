import { describe, it, expect } from "vitest";
import { explodeRecipe, ingredientCostPerUnit } from "@/lib/inventory/recipe";

describe("recipe explosion (spec §7)", () => {
  it("explodes a Cappuccino recipe for 2 units — 36g coffee + 500ml milk", () => {
    const lines = explodeRecipe(
      [
        { ingredientId: "coffee", quantity: 18, unit: "G", ingredientUnit: "KG" },
        { ingredientId: "milk", quantity: 250, unit: "ML", ingredientUnit: "L" },
      ],
      2
    );
    const coffee = lines.find((l) => l.ingredientId === "coffee")!;
    const milk = lines.find((l) => l.ingredientId === "milk")!;
    expect(coffee.quantity).toBeCloseTo(0.036); // 36g in kg
    expect(milk.quantity).toBeCloseTo(0.5); // 500ml in L
  });

  it("applies preparation waste percentage on top of the raw recipe amount", () => {
    const lines = explodeRecipe(
      [{ ingredientId: "chicken", quantity: 200, unit: "G", ingredientUnit: "G" }],
      1,
      10 // 10% prep waste
    );
    expect(lines[0].quantity).toBeCloseTo(220);
  });

  it("computes ingredient cost per product unit", () => {
    const cost = ingredientCostPerUnit([
      { ingredientId: "coffee", quantity: 18, unit: "G", ingredientUnit: "KG", costPerUnit: 4500 },
      { ingredientId: "milk", quantity: 250, unit: "ML", ingredientUnit: "L", costPerUnit: 280 },
    ]);
    // 0.018kg * 4500 + 0.25L * 280 = 81 + 70 = 151
    expect(cost).toBeCloseTo(151);
  });
});
