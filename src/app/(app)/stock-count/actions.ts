"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/session";
import { postTransaction } from "@/lib/inventory/ledger";

export async function startStockCount(locationId: string) {
  const session = await requireSection("stock-count");
  const ingredients = await prisma.ingredient.findMany({ where: { locationId }, include: { definition: true } });

  const count = await prisma.stockCount.create({
    data: {
      businessId: session.user.businessId, locationId, performedById: session.user.id, status: "IN_PROGRESS",
      items: {
        create: ingredients.map((i) => ({ ingredientId: i.id, expectedQty: i.currentStock, unit: i.definition.unit })),
      },
    },
  });

  revalidatePath("/stock-count");
  redirect(`/stock-count/${count.id}`);
}

const submitSchema = z.object({
  stockCountId: z.string().min(1),
  entries: z.array(z.object({ itemId: z.string().min(1), actualQty: z.coerce.number().min(0) })),
});

export async function submitStockCount(formData: FormData) {
  const session = await requireSection("stock-count");
  const parsed = submitSchema.parse({
    stockCountId: formData.get("stockCountId"),
    entries: JSON.parse(String(formData.get("entries"))),
  });

  const count = await prisma.stockCount.findUniqueOrThrow({ where: { id: parsed.stockCountId }, include: { items: true } });

  await prisma.$transaction(async (tx) => {
    for (const entry of parsed.entries) {
      const item = count.items.find((i) => i.id === entry.itemId);
      if (!item) continue;
      await tx.stockCountItem.update({ where: { id: item.id }, data: { actualQty: entry.actualQty } });
      const diff = entry.actualQty - item.expectedQty;
      if (Math.abs(diff) > 0.0001) {
        await postTransaction(tx, {
          businessId: count.businessId, locationId: count.locationId, ingredientId: item.ingredientId,
          type: "STOCK_COUNT", quantity: diff, refType: "StockCount", refId: count.id,
          note: "Reconciled to physical count",
        });
      }
    }
    await tx.stockCount.update({ where: { id: count.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  });

  await prisma.auditLog.create({
    data: {
      businessId: count.businessId, locationId: count.locationId, userId: session.user.id,
      action: "COMPLETE", entityType: "StockCount", entityId: count.id,
    },
  });

  revalidatePath("/stock-count");
  revalidatePath(`/stock-count/${count.id}`);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
