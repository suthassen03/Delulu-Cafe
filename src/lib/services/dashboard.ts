import { prisma } from "@/lib/prisma";
import { resolvePeriod, previousPeriod } from "@/lib/dateRange";
import { getIngredientMetrics } from "@/lib/services/metrics";
import { percentChange } from "@/lib/inventory/forecast";
import { refreshAlerts, getOpenAlerts } from "@/lib/services/alerts";

export async function getDashboardData(businessId: string, locationIds: string[]) {
  const today = resolvePeriod("today");
  const yesterday = resolvePeriod("yesterday");

  const [todaySales, yesterdaySales, ingredientCount, metrics] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId, locationId: { in: locationIds }, createdAt: { gte: today.start, lte: today.end } },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: { businessId, locationId: { in: locationIds }, createdAt: { gte: yesterday.start, lte: yesterday.end } },
      _sum: { total: true },
    }),
    prisma.ingredient.count({ where: { businessId, locationId: { in: locationIds } } }),
    getIngredientMetrics(businessId, locationIds),
  ]);

  await refreshAlerts(businessId, locationIds);
  const openAlerts = await getOpenAlerts(businessId, locationIds);

  const expectedOutOfStock = metrics.filter((m) => Number.isFinite(m.daysRemaining) && m.daysRemaining <= 2).length;

  const recentSales = await prisma.sale.findMany({
    where: { businessId, locationId: { in: locationIds } },
    include: { items: { include: { product: true } }, location: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const salesToday = todaySales._sum.total ?? 0;
  const salesYesterday = yesterdaySales._sum.total ?? 0;

  return {
    salesToday,
    salesChangePct: percentChange(salesToday, salesYesterday),
    itemsInStock: ingredientCount,
    openAlertsCount: openAlerts.length,
    expectedOutOfStock,
    recentSales,
    topAlerts: openAlerts.slice(0, 5),
  };
}
