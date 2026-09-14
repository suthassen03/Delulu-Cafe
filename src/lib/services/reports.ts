import { prisma } from "@/lib/prisma";
import type { DateRange } from "@/lib/dateRange";
import { getIngredientMetrics } from "@/lib/services/metrics";
import { getProductsWithProfitability } from "@/lib/services/products";

export async function getInventoryValueReport(businessId: string, locationIds: string[]) {
  const metrics = await getIngredientMetrics(businessId, locationIds);
  const rows = metrics.map((m) => ({ ...m, value: m.currentStock * m.costPerUnit }));
  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  return { rows: rows.sort((a, b) => b.value - a.value), totalValue };
}

export async function getSalesReport(businessId: string, locationIds: string[], range: DateRange) {
  const sales = await prisma.sale.findMany({
    where: { businessId, locationId: { in: locationIds }, createdAt: { gte: range.start, lte: range.end } },
    include: { items: { include: { product: true } }, location: true },
    orderBy: { createdAt: "desc" },
  });
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const byProduct = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const s of sales) {
    for (const item of s.items) {
      const bucket = byProduct.get(item.productId) ?? { name: item.product.name, quantity: 0, revenue: 0 };
      bucket.quantity += item.quantity;
      bucket.revenue += item.quantity * item.unitPrice;
      byProduct.set(item.productId, bucket);
    }
  }
  return {
    sales, totalRevenue, saleCount: sales.length,
    byProduct: Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue),
  };
}

export async function getPurchasesReport(businessId: string, locationIds: string[], range: DateRange) {
  const purchases = await prisma.purchase.findMany({
    where: { businessId, locationId: { in: locationIds }, orderDate: { gte: range.start, lte: range.end } },
    include: { supplier: true, items: true, location: true },
    orderBy: { orderDate: "desc" },
  });
  const totalSpend = purchases.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), 0);
  return { purchases, totalSpend };
}

export async function getWasteReport(businessId: string, locationIds: string[], range: DateRange) {
  const records = await prisma.wasteRecord.findMany({
    where: { businessId, locationId: { in: locationIds }, createdAt: { gte: range.start, lte: range.end } },
    include: { ingredient: { include: { definition: true } }, employee: true },
    orderBy: { createdAt: "desc" },
  });
  const totalCost = records.reduce((sum, r) => sum + r.quantity * r.ingredient.costPerUnit, 0);
  const byReason = new Map<string, number>();
  for (const r of records) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + r.quantity * r.ingredient.costPerUnit);
  return { records, totalCost, byReason: Array.from(byReason.entries()).map(([reason, cost]) => ({ reason, cost })) };
}

export async function getVarianceReport(businessId: string, locationIds: string[], range: DateRange) {
  const items = await prisma.stockCountItem.findMany({
    where: {
      stockCount: { businessId, locationId: { in: locationIds }, status: "COMPLETED", completedAt: { gte: range.start, lte: range.end } },
      actualQty: { not: null },
    },
    include: { ingredient: { include: { definition: true } }, stockCount: true },
  });
  const rows = items.map((i) => {
    const difference = (i.actualQty ?? 0) - i.expectedQty;
    const estimatedLoss = difference < 0 ? Math.abs(difference) * i.ingredient.costPerUnit : 0;
    return {
      name: i.ingredient.definition.name, unit: i.unit, expected: i.expectedQty, actual: i.actualQty ?? 0,
      difference, estimatedLoss, countedAt: i.stockCount.completedAt,
    };
  });
  return { rows, totalLoss: rows.reduce((sum, r) => sum + r.estimatedLoss, 0) };
}

export async function getProfitabilityReport(businessId: string, pricingLocationId: string, locationIds: string[], range: DateRange) {
  const [products, saleItems] = await Promise.all([
    getProductsWithProfitability(businessId, pricingLocationId),
    prisma.saleItem.findMany({
      where: { sale: { businessId, locationId: { in: locationIds }, createdAt: { gte: range.start, lte: range.end } } },
    }),
  ]);
  const soldByProduct = new Map<string, number>();
  for (const item of saleItems) soldByProduct.set(item.productId, (soldByProduct.get(item.productId) ?? 0) + item.quantity);

  return products
    .map((p) => {
      const quantitySold = soldByProduct.get(p.id) ?? 0;
      return { ...p, quantitySold, totalContribution: quantitySold * p.grossProfit };
    })
    .sort((a, b) => b.totalContribution - a.totalContribution);
}

export async function getSupplierSpendReport(businessId: string, locationIds: string[], range: DateRange) {
  const purchases = await prisma.purchase.findMany({
    where: { businessId, locationId: { in: locationIds }, orderDate: { gte: range.start, lte: range.end } },
    include: { supplier: true, items: true },
  });
  const bySupplier = new Map<string, { name: string; spend: number; orders: number }>();
  for (const p of purchases) {
    const spend = p.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const bucket = bySupplier.get(p.supplierId) ?? { name: p.supplier.name, spend: 0, orders: 0 };
    bucket.spend += spend;
    bucket.orders += 1;
    bySupplier.set(p.supplierId, bucket);
  }
  return Array.from(bySupplier.values()).sort((a, b) => b.spend - a.spend);
}

export async function getStockForecastReport(businessId: string, locationIds: string[]) {
  const metrics = await getIngredientMetrics(businessId, locationIds);
  return metrics
    .filter((m) => Number.isFinite(m.daysRemaining))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
