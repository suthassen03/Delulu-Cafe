import { requireSection, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPurchaseSuggestions } from "@/lib/services/purchasing";
import { PurchasesClient } from "@/components/purchases/PurchasesClient";
import type { Role } from "@/lib/enums";

export default async function PurchasesPage() {
  const session = await requireSection("purchases");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  const purchaseLocationId = activeLocationId === "ALL" ? allLocations[0]?.id : activeLocationId;

  const [purchases, suppliers, ingredients, suggestions] = await Promise.all([
    prisma.purchase.findMany({
      where: { businessId: session.user.businessId, locationId: { in: locationIds } },
      include: { supplier: true, items: { include: { ingredient: { include: { definition: true } } } }, location: true },
      orderBy: { orderDate: "desc" },
      take: 30,
    }),
    prisma.supplier.findMany({ where: { businessId: session.user.businessId }, orderBy: { name: "asc" } }),
    prisma.ingredient.findMany({ where: { locationId: purchaseLocationId }, include: { definition: true } }),
    getPurchaseSuggestions(session.user.businessId, locationIds),
  ]);

  return (
    <PurchasesClient
      purchases={purchases}
      suppliers={suppliers}
      ingredients={ingredients}
      suggestions={suggestions}
      purchaseLocationId={purchaseLocationId}
    />
  );
}
