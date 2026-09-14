import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIngredientMetricById } from "@/lib/services/metrics";
import { IngredientDetailClient } from "@/components/inventory/IngredientDetailClient";

export default async function IngredientDetailPage({ params }: { params: { id: string } }) {
  await requireSection("inventory");
  const metric = await getIngredientMetricById(params.id);
  if (!metric) notFound();

  const [transactions, suppliers] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where: { ingredientId: params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.supplier.findMany({ where: { businessId: (await prisma.ingredient.findUniqueOrThrow({ where: { id: params.id } })).businessId } }),
  ]);

  return <IngredientDetailClient metric={metric} transactions={transactions} suppliers={suppliers} />;
}
