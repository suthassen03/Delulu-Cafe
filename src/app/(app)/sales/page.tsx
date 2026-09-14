import { requireSection, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SalesClient } from "@/components/sales/SalesClient";
import type { Role } from "@/lib/enums";

export default async function SalesPage() {
  const session = await requireSection("sales");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  const saleLocationId = activeLocationId === "ALL" ? allLocations[0]?.id : activeLocationId;

  const [products, recentSales] = await Promise.all([
    prisma.product.findMany({ where: { businessId: session.user.businessId, available: true }, orderBy: { name: "asc" } }),
    prisma.sale.findMany({
      where: { businessId: session.user.businessId, locationId: { in: locationIds } },
      include: { items: { include: { product: true } }, location: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return <SalesClient products={products} recentSales={recentSales} saleLocationId={saleLocationId} />;
}
