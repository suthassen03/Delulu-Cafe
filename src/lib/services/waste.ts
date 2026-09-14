import { prisma } from "@/lib/prisma";
import { resolvePeriod, previousPeriod } from "@/lib/dateRange";
import { percentChange } from "@/lib/inventory/forecast";

async function wasteCostInRange(businessId: string, locationIds: string[], start: Date, end: Date) {
  const records = await prisma.wasteRecord.findMany({
    where: { businessId, locationId: { in: locationIds }, createdAt: { gte: start, lte: end } },
    include: { ingredient: true },
  });
  return records.reduce((sum, r) => sum + r.quantity * r.ingredient.costPerUnit, 0);
}

export async function getWasteAnalytics(businessId: string, locationIds: string[]) {
  const today = resolvePeriod("today");
  const thisWeek = resolvePeriod("thisWeek");
  const thisMonth = resolvePeriod("thisMonth");
  const lastMonth = resolvePeriod("lastMonth");

  const [todayCost, weekCost, monthCost, lastMonthCost, purchasesThisMonth, records, byIngredient] = await Promise.all([
    wasteCostInRange(businessId, locationIds, today.start, today.end),
    wasteCostInRange(businessId, locationIds, thisWeek.start, thisWeek.end),
    wasteCostInRange(businessId, locationIds, thisMonth.start, thisMonth.end),
    wasteCostInRange(businessId, locationIds, lastMonth.start, lastMonth.end),
    prisma.purchaseItem.findMany({
      where: { purchase: { businessId, locationId: { in: locationIds }, status: "RECEIVED", receivedAt: { gte: thisMonth.start, lte: thisMonth.end } } },
    }),
    prisma.wasteRecord.findMany({
      where: { businessId, locationId: { in: locationIds } },
      include: { ingredient: { include: { definition: true } }, employee: true, location: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.wasteRecord.groupBy({
      by: ["ingredientId"],
      where: { businessId, locationId: { in: locationIds }, createdAt: { gte: thisMonth.start, lte: thisMonth.end } },
      _sum: { quantity: true },
    }),
  ]);

  const purchasesThisMonthValue = purchasesThisMonth.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  const wastePercentOfPurchases = purchasesThisMonthValue > 0 ? (monthCost / purchasesThisMonthValue) * 100 : 0;

  let mostWastedIngredientId: string | null = null;
  let mostWastedQty = 0;
  for (const g of byIngredient) {
    const qty = g._sum.quantity ?? 0;
    if (qty > mostWastedQty) { mostWastedQty = qty; mostWastedIngredientId = g.ingredientId; }
  }
  const mostWastedIngredient = mostWastedIngredientId
    ? await prisma.ingredient.findUnique({ where: { id: mostWastedIngredientId }, include: { definition: true } })
    : null;

  return {
    todayCost, weekCost, monthCost,
    monthChangePct: percentChange(monthCost, lastMonthCost),
    wastePercentOfPurchases,
    mostWastedIngredientName: mostWastedIngredient?.definition.name ?? null,
    recentWaste: records,
  };
}
