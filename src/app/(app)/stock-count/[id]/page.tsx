import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StockCountDetailClient } from "@/components/stockcount/StockCountDetailClient";

export default async function StockCountDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSection("stock-count");
  const count = await prisma.stockCount.findUnique({
    where: { id: params.id },
    include: {
      location: true, performedBy: true,
      items: { include: { ingredient: { include: { definition: true } } } },
    },
  });
  if (!count || count.businessId !== session.user.businessId) notFound();

  return <StockCountDetailClient count={count} />;
}
