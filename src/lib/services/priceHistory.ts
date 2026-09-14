import { prisma } from "@/lib/prisma";

export interface PricePoint {
  month: string; // "2026-06"
  avgUnitPrice: number;
}

/** Spec §19 — monthly average purchase price for one ingredient definition, across received purchases. */
export async function getPriceHistory(businessId: string, definitionId: string): Promise<PricePoint[]> {
  const items = await prisma.purchaseItem.findMany({
    where: {
      ingredient: { definitionId },
      purchase: { businessId, status: "RECEIVED" },
    },
    include: { purchase: true },
  });

  const byMonth = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const d = item.purchase.receivedAt ?? item.purchase.orderDate;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(month) ?? { total: 0, count: 0 };
    bucket.total += item.unitPrice;
    bucket.count += 1;
    byMonth.set(month, bucket);
  }

  return Array.from(byMonth.entries())
    .map(([month, { total, count }]) => ({ month, avgUnitPrice: Math.round((total / count) * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
