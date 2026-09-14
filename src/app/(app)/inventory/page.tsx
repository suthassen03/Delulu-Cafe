import { requireSection, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { getIngredientMetrics } from "@/lib/services/metrics";
import { prisma } from "@/lib/prisma";
import { InventoryClient } from "@/components/inventory/InventoryClient";
import type { Role } from "@/lib/enums";

export default async function InventoryPage() {
  const session = await requireSection("inventory");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId,
    session.user.role as Role,
    session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  const [metrics, categories, suppliers] = await Promise.all([
    getIngredientMetrics(session.user.businessId, locationIds),
    prisma.category.findMany({ where: { businessId: session.user.businessId }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { businessId: session.user.businessId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <InventoryClient
      metrics={metrics}
      categories={categories}
      suppliers={suppliers}
      locations={allLocations.filter((l) => locationIds.includes(l.id))}
      role={session.user.role as Role}
    />
  );
}
