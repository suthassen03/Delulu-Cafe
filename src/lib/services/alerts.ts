import { prisma } from "@/lib/prisma";
import { getIngredientMetrics } from "@/lib/services/metrics";
import { evaluateIngredientAlerts } from "@/lib/inventory/alerts";

/**
 * Recomputes alerts for every ingredient across the given locations: opens
 * new ones for newly-triggered conditions, and auto-resolves OPEN alerts
 * whose condition no longer holds. Safe to call on every dashboard/alerts
 * page load — it's idempotent (never opens a duplicate of the same open
 * type+ingredient alert).
 */
export async function refreshAlerts(businessId: string, locationIds: string[]) {
  const metrics = await getIngredientMetrics(businessId, locationIds);
  const triggeringKeys = new Set<string>(); // `${ingredientId}:${type}`

  for (const m of metrics) {
    const candidates = evaluateIngredientAlerts({
      name: m.name,
      unit: m.unit,
      currentStock: m.currentStock,
      minLevel: m.minLevel,
      daysRemaining: m.daysRemaining,
      recentUsage7d: m.recentUsage7d,
      baselineUsage28d: m.baselineUsage28d,
      recentWasteWeek: m.recentWasteWeek,
      baselineWasteWeeklyAvg: m.baselineWasteWeeklyAvg,
    });

    for (const c of candidates) {
      triggeringKeys.add(`${m.id}:${c.type}`);
      // One row per (ingredient, type) forever — upsert is atomic, so
      // concurrent requests can never create duplicate alert rows.
      await prisma.alert.upsert({
        where: { ingredientId_type: { ingredientId: m.id, type: c.type } },
        create: {
          businessId, locationId: m.locationId, ingredientId: m.id,
          type: c.type, severity: c.severity, message: c.message, status: "OPEN",
        },
        update: { severity: c.severity, message: c.message, status: "OPEN" },
      });
    }
  }

  const openAlerts = await prisma.alert.findMany({
    where: { businessId, locationId: { in: locationIds }, status: "OPEN" },
    select: { id: true, ingredientId: true, type: true },
  });
  const staleIds = openAlerts
    .filter((a) => !a.ingredientId || !triggeringKeys.has(`${a.ingredientId}:${a.type}`))
    .map((a) => a.id);
  if (staleIds.length > 0) {
    await prisma.alert.updateMany({ where: { id: { in: staleIds } }, data: { status: "RESOLVED" } });
  }
}

export async function getOpenAlerts(businessId: string, locationIds: string[]) {
  return prisma.alert.findMany({
    where: { businessId, locationId: { in: locationIds }, status: "OPEN" },
    include: { ingredient: { include: { definition: true } }, location: true },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });
}
