import { requireSection, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getWasteAnalytics } from "@/lib/services/waste";
import { WasteClient } from "@/components/waste/WasteClient";
import type { Role } from "@/lib/enums";

export default async function WastePage() {
  const session = await requireSection("waste");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  const wasteLocationId = activeLocationId === "ALL" ? allLocations[0]?.id : activeLocationId;

  const [analytics, ingredients] = await Promise.all([
    getWasteAnalytics(session.user.businessId, locationIds),
    prisma.ingredient.findMany({ where: { locationId: wasteLocationId }, include: { definition: true }, orderBy: { definition: { name: "asc" } } }),
  ]);

  return <WasteClient analytics={analytics} ingredients={ingredients} />;
}
