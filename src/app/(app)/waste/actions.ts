"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/session";
import { postTransaction } from "@/lib/inventory/ledger";
import { WASTE_REASONS } from "@/lib/enums";

const schema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  reason: z.enum(WASTE_REASONS),
  notes: z.string().optional(),
});

export async function registerWaste(formData: FormData) {
  const session = await requireSection("waste");
  const parsed = schema.parse(Object.fromEntries(formData));
  const ingredient = await prisma.ingredient.findUniqueOrThrow({ where: { id: parsed.ingredientId }, include: { definition: true } });

  await prisma.$transaction(async (tx) => {
    const waste = await tx.wasteRecord.create({
      data: {
        businessId: ingredient.businessId, locationId: ingredient.locationId, ingredientId: ingredient.id,
        quantity: parsed.quantity, unit: ingredient.definition.unit, reason: parsed.reason,
        notes: parsed.notes || null, employeeId: session.user.id,
      },
    });
    await postTransaction(tx, {
      businessId: ingredient.businessId, locationId: ingredient.locationId, ingredientId: ingredient.id,
      type: "WASTE", quantity: -parsed.quantity, refType: "WasteRecord", refId: waste.id,
    });
  });

  revalidatePath("/waste");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
