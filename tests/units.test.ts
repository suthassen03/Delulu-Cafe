import { describe, it, expect } from "vitest";
import { convert, toBaseQty, fromBaseQty, compatible } from "@/lib/inventory/units";

describe("units", () => {
  it("converts kg to g", () => {
    expect(convert(1, "KG", "G")).toBe(1000);
  });
  it("converts g to kg", () => {
    expect(convert(1500, "G", "KG")).toBe(1.5);
  });
  it("converts L to ml", () => {
    expect(convert(2, "L", "ML")).toBe(2000);
  });
  it("converts pack to pcs using packSize", () => {
    expect(convert(3, "PACK", "PCS", 12)).toBe(36);
  });
  it("converts pcs to box using packSize", () => {
    expect(convert(24, "PCS", "BOX", 12)).toBe(2);
  });
  it("returns the same value for identical units", () => {
    expect(convert(5, "KG", "KG")).toBe(5);
  });
  it("throws converting across dimensions", () => {
    expect(() => convert(1, "KG", "ML")).toThrow();
  });
  it("flags incompatible units", () => {
    expect(compatible("G", "ML")).toBe(false);
    expect(compatible("G", "KG")).toBe(true);
  });
  it("round-trips base conversions", () => {
    const base = toBaseQty(2.5, "KG");
    expect(fromBaseQty(base, "KG")).toBeCloseTo(2.5);
  });
});
