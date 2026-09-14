export interface VarianceResult {
  difference: number; // actual - expected, signed
  percentDifference: number;
  estimatedLoss: number; // in LKR, only counts shortfall (actual < expected)
}

/** Spec §11: stock-count variance and its estimated financial impact. */
export function computeVariance(expected: number, actual: number, costPerUnit: number): VarianceResult {
  const difference = actual - expected;
  const percentDifference = expected !== 0 ? (difference / expected) * 100 : actual === 0 ? 0 : 100;
  const estimatedLoss = difference < 0 ? Math.abs(difference) * costPerUnit : 0;
  return { difference, percentDifference, estimatedLoss };
}
