import type { UnitCode } from "@/lib/enums";

// Three dimensions: mass (base G), volume (base ML), count (base PCS).
// PACK and BOX are count-dimension units that need a per-ingredient
// packSize (pieces per pack/box) to convert down to PCS.
type Dimension = "mass" | "volume" | "count";

const DIMENSION: Record<UnitCode, Dimension> = {
  G: "mass",
  KG: "mass",
  ML: "volume",
  L: "volume",
  PCS: "count",
  PACK: "count",
  BOX: "count",
};

// Multiplier to convert 1 of this unit into its dimension's base unit
// (G for mass, ML for volume, PCS for count — packSize handled separately).
const TO_BASE: Record<UnitCode, number> = {
  G: 1,
  KG: 1000,
  ML: 1,
  L: 1000,
  PCS: 1,
  PACK: 1, // resolved via packSize at call sites
  BOX: 1,
};

export function dimensionOf(unit: UnitCode): Dimension {
  return DIMENSION[unit];
}

export function baseUnitFor(unit: UnitCode): UnitCode {
  const dim = DIMENSION[unit];
  if (dim === "mass") return "G";
  if (dim === "volume") return "ML";
  return "PCS";
}

/** Converts a quantity in `unit` to the base unit for its dimension. */
export function toBaseQty(qty: number, unit: UnitCode, packSize?: number | null): number {
  if (unit === "PACK" || unit === "BOX") {
    return qty * (packSize && packSize > 0 ? packSize : 1);
  }
  return qty * TO_BASE[unit];
}

/** Converts a quantity in the dimension's base unit back to `unit`. */
export function fromBaseQty(baseQty: number, unit: UnitCode, packSize?: number | null): number {
  if (unit === "PACK" || unit === "BOX") {
    return baseQty / (packSize && packSize > 0 ? packSize : 1);
  }
  return baseQty / TO_BASE[unit];
}

/** Converts a quantity between any two compatible units (same dimension). */
export function convert(
  qty: number,
  fromUnit: UnitCode,
  toUnit: UnitCode,
  packSize?: number | null
): number {
  if (fromUnit === toUnit) return qty;
  if (dimensionOf(fromUnit) !== dimensionOf(toUnit)) {
    throw new Error(`Cannot convert ${fromUnit} to ${toUnit} — different dimensions`);
  }
  return fromBaseQty(toBaseQty(qty, fromUnit, packSize), toUnit, packSize);
}

export function compatible(a: UnitCode, b: UnitCode): boolean {
  return DIMENSION[a] === DIMENSION[b];
}

export const UNIT_LABELS: Record<UnitCode, string> = {
  G: "g",
  KG: "kg",
  ML: "ml",
  L: "L",
  PCS: "pcs",
  PACK: "pack",
  BOX: "box",
};
