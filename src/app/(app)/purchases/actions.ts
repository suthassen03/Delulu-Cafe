"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/session";
import { postTransaction } from "@/lib/inventory/ledger";
import { UNITS } from "@/lib/enums";

const createPurchaseSchema = z.object({
  locationId: z.string().min(1),
  supplierId: z.string().min(1),
  invoiceRef: z.string().optional(),
  deliveryDate: z.string().optional(),
  items: z.array(z.object({
    ingredientId: z.string().min(1), quantity: z.coerce.number().positive(),
    unit: z.enum(UNITS), unitPrice: z.coerce.number().min(0),
  })).min(1),
});

export async function createPurchase(formData: FormData) {
  const session = await requireSection("purchases");
  const parsed = createPurchaseSchema.parse({
    locationId: formData.get("locationId"),
    supplierId: formData.get("supplierId"),
    invoiceRef: formData.get("invoiceRef") || undefined,
    deliveryDate: formData.get("deliveryDate") || undefined,
    items: JSON.parse(String(formData.get("items"))),
  });

  await prisma.purchase.create({
    data: {
      businessId: session.user.businessId, locationId: parsed.locationId, supplierId: parsed.supplierId,
      status: "ORDERED", invoiceRef: parsed.invoiceRef,
      deliveryDate: parsed.deliveryDate ? new Date(parsed.deliveryDate) : undefined,
      items: { create: parsed.items },
    },
  });

  revalidatePath("/purchases");
}

export async function receivePurchase(purchaseId: string) {
  const session = await requireSection("purchases");
  const purchase = await prisma.purchase.findUniqueOrThrow({ where: { id: purchaseId }, include: { items: true } });

  await prisma.$transaction(async (tx) => {
    for (const item of purchase.items) {
      await postTransaction(tx, {
        businessId: purchase.businessId, locationId: purchase.locationId, ingredientId: item.ingredientId,
        type: "PURCHASE", quantity: item.quantity, refType: "Purchase", refId: purchase.id,
      });
      await tx.ingredient.update({ where: { id: item.ingredientId }, data: { costPerUnit: item.unitPrice } });
    }
    await tx.purchase.update({ where: { id: purchaseId }, data: { status: "RECEIVED", receivedAt: new Date() } });
  });

  await prisma.auditLog.create({
    data: {
      businessId: purchase.businessId, locationId: purchase.locationId, userId: session.user.id,
      action: "RECEIVE", entityType: "Purchase", entityId: purchase.id,
    },
  });

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
