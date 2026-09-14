import { prisma } from "@/lib/prisma";
import { resolvePeriod } from "@/lib/dateRange";
import { getIngredientMetrics } from "@/lib/services/metrics";
import { getWasteAnalytics } from "@/lib/services/waste";
import { percentChange } from "@/lib/inventory/forecast";
import { formatLKR } from "@/lib/format";

/** Spec §25 — a real, computed daily management summary (no invented figures). */
export async function generateDailySummary(businessId: string, locationIds: string[], businessName: string) {
  const today = resolvePeriod("today");
  const [salesAgg, metrics, waste] = await Promise.all([
    prisma.sale.aggregate({ where: { businessId, locationId: { in: locationIds }, createdAt: { gte: today.start, lte: today.end } }, _sum: { total: true } }),
    getIngredientMetrics(businessId, locationIds),
    getWasteAnalytics(businessId, locationIds),
  ]);

  const runningLow = metrics.filter((m) => m.status !== "OK");
  const runningOutTomorrow = metrics.filter((m) => Number.isFinite(m.daysRemaining) && m.daysRemaining <= 1);
  const biggestUsageJump = [...metrics]
    .filter((m) => m.baselineUsage28d > 0)
    .map((m) => ({ m, pct: percentChange(m.recentUsage7d, m.baselineUsage28d) }))
    .sort((a, b) => b.pct - a.pct)[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const lines: string[] = [];
  lines.push(`${greeting} — ${businessName}`);
  lines.push("");
  lines.push(`Today's sales: ${formatLKR(salesAgg._sum.total ?? 0)}`);
  lines.push("");
  lines.push(`${runningLow.length} item(s) require attention.`);
  if (runningOutTomorrow.length > 0) {
    lines.push(`${runningOutTomorrow.map((m) => m.name).join(", ")} expected to run out within a day.`);
  }
  if (biggestUsageJump && biggestUsageJump.pct >= 15) {
    lines.push(`${biggestUsageJump.m.name} usage is ${Math.round(biggestUsageJump.pct)}% above its normal baseline.`);
  }
  lines.push("");
  lines.push(`Estimated waste today: ${formatLKR(waste.todayCost)}.`);
  lines.push("");
  const actions: string[] = [];
  if (runningOutTomorrow.length > 0) actions.push(`order ${runningOutTomorrow.map((m) => m.name).join(" and ")}`);
  if (biggestUsageJump && biggestUsageJump.pct >= 15) actions.push(`review ${biggestUsageJump.m.name} usage`);
  lines.push(`Recommended action: ${actions.length > 0 ? actions.join("; ") : "no urgent action needed today."}`);

  return lines.join("\n");
}
