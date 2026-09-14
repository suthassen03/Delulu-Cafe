import { requireSection } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPriceHistory } from "@/lib/services/priceHistory";
import { SuppliersClient } from "@/components/suppliers/SuppliersClient";

export default async function SuppliersPage() {
  const session = await requireSection("purchases");
  const [suppliers, definitions] = await Promise.all([
    prisma.supplier.findMany({
      where: { businessId: session.user.businessId },
      include: { _count: { select: { ingredients: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.ingredientDefinition.findMany({ where: { businessId: session.user.businessId }, orderBy: { name: "asc" } }),
  ]);

  const defaultDefinitionId = definitions.find((d) => d.name === "Coffee Beans")?.id ?? definitions[0]?.id ?? "";
  const priceHistory = defaultDefinitionId ? await getPriceHistory(session.user.businessId, defaultDefinitionId) : [];

  return <SuppliersClient suppliers={suppliers} definitions={definitions} initialDefinitionId={defaultDefinitionId} initialPriceHistory={priceHistory} />;
}
