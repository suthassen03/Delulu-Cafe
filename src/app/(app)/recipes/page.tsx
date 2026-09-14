import { requireSection, resolveActiveLocationId } from "@/lib/session";
import { getProductsWithProfitability } from "@/lib/services/products";
import { RecipesClient } from "@/components/recipes/RecipesClient";
import type { Role } from "@/lib/enums";

export default async function RecipesPage() {
  const session = await requireSection("recipes");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const pricingLocationId = activeLocationId === "ALL" ? allLocations[0]?.id : activeLocationId;
  const products = await getProductsWithProfitability(session.user.businessId, pricingLocationId);

  return <RecipesClient products={products} role={session.user.role as Role} pricedAgainstAll={activeLocationId === "ALL"} />;
}
