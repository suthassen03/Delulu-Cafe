export interface LedgerEntryLike {
  quantity: number; // signed; negative = consumption/waste
  createdAt: Date;
}

/**
 * Average daily usage over a trailing window, from signed ledger entries
 * (negative = stock leaving). Simple moving average — no day-of-week or
 * seasonal weighting yet (documented Phase 3 upgrade, spec §15).
 */
export function averageDailyUsage(
  entries: LedgerEntryLike[],
  windowDays: number,
  asOf: Date = new Date()
): number {
  const windowStart = new Date(asOf.getTime() - windowDays * 86_400_000);
  const total = entries
    .filter((e) => e.createdAt >= windowStart && e.createdAt <= asOf && e.quantity < 0)
    .reduce((sum, e) => sum + Math.abs(e.quantity), 0);
  return total / windowDays;
}

/** Days of stock remaining at the given average daily usage rate. Infinity if usage is ~0. */
export function daysRemaining(currentStock: number, avgDailyUsage: number): number {
  if (avgDailyUsage <= 0.000001) return Infinity;
  return currentStock / avgDailyUsage;
}

/** Percentage change between two average-usage figures (e.g. last 7 days vs prior 28-day baseline). */
export function percentChange(recent: number, baseline: number): number {
  if (baseline <= 0.000001) return recent > 0 ? 100 : 0;
  return ((recent - baseline) / baseline) * 100;
}
