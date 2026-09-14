/**
 * Recommended purchase quantity (spec §17): cover the next `leadTimeDays` +
 * a safety buffer of `coverDays` beyond that, given current stock and the
 * recent average daily usage rate.
 */
export function recommendPurchaseQty(
  currentStock: number,
  avgDailyUsage: number,
  leadTimeDays: number,
  coverDays = 7
): number {
  if (avgDailyUsage <= 0) return 0;
  const targetCoverDays = leadTimeDays + coverDays;
  const projectedUsage = avgDailyUsage * targetCoverDays;
  const deficit = projectedUsage - currentStock;
  return deficit > 0 ? Math.ceil(deficit * 100) / 100 : 0;
}

export function shouldRecommendPurchase(daysRemaining: number, leadTimeDays: number): boolean {
  return daysRemaining <= leadTimeDays + 1;
}
