import { requireSection, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StockCountClient } from "@/components/stockcount/StockCountClient";
import type { Role } from "@/lib/enums";

export default async function StockCountPage() {
  const session = await requireSection("stock-count");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  const countLocationId = activeLocationId === "ALL" ? allLocations[0]?.id : activeLocationId;

  const counts = await prisma.stockCount.findMany({
    where: { businessId: session.user.businessId, locationId: { in: locationIds } },
    include: { performedBy: true, location: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return <StockCountClient counts={counts} countLocationId={countLocationId} />;
}
