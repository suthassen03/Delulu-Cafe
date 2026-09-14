"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/session";
import { postTransaction } from "@/lib/inventory/ledger";
import { UNITS } from "@/lib/enums";

const createIngredientSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().optional(),
  unit: z.enum(UNITS),
  packSize: z.coerce.number().optional(),
  currentStock: z.coerce.number().min(0),
  minLevel: z.coerce.number().min(0),
  costPerUnit: z.coerce.number().min(0),
  supplierId: z.string().optional(),
  sku: z.string().optional(),
});

export async function createIngredient(formData: FormData) {
  const session = await requireSection("inventory");
  const parsed = createIngredientSchema.parse(Object.fromEntries(formData));

  const definition = await prisma.ingredientDefinition.create({
    data: {
      businessId: session.user.businessId,
      name: parsed.name,
      categoryId: parsed.categoryId || null,
      unit: parsed.unit,
      packSize: parsed.packSize || null,
      sku: parsed.sku || null,
    },
  });

  const ingredient = await prisma.ingredient.create({
    data: {
      businessId: session.user.businessId,
      locationId: parsed.locationId,
      definitionId: definition.id,
      currentStock: 0,
      minLevel: parsed.minLevel,
      costPerUnit: parsed.costPerUnit,
      supplierId: parsed.supplierId || null,
    },
  });

  if (parsed.currentStock > 0) {
    await prisma.$transaction(async (tx) => {
      await postTransaction(tx, {
        businessId: session.user.businessId,
        locationId: parsed.locationId,
        ingredientId: ingredient.id,
        type: "STOCK_ADJUSTMENT",
        quantity: parsed.currentStock,
        note: "Opening stock",
      });
    });
  }

  await prisma.auditLog.create({
    data: {
      businessId: session.user.businessId, locationId: parsed.locationId, userId: session.user.id,
      action: "CREATE", entityType: "Ingredient", entityId: ingredient.id,
      newValue: JSON.stringify(parsed),
    },
  });

  revalidatePath("/inventory");
}

const adjustStockSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.coerce.number(),
  reason: z.string().min(1),
});

export async function adjustStock(formData: FormData) {
  const session = await requireSection("inventory");
  const parsed = adjustStockSchema.parse(Object.fromEntries(formData));
  const ingredient = await prisma.ingredient.findUniqueOrThrow({ where: { id: parsed.ingredientId } });

  await prisma.$transaction(async (tx) => {
    await postTransaction(tx, {
      businessId: ingredient.businessId, locationId: ingredient.locationId, ingredientId: ingredient.id,
      type: "STOCK_ADJUSTMENT", quantity: parsed.quantity, note: parsed.reason,
    });
    await tx.stockAdjustment.create({
      data: {
        businessId: ingredient.businessId, locationId: ingredient.locationId, ingredientId: ingredient.id,
        quantity: parsed.quantity, reason: parsed.reason, userId: session.user.id,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      businessId: ingredient.businessId, locationId: ingredient.locationId, userId: session.user.id,
      action: "STOCK_ADJUSTMENT", entityType: "Ingredient", entityId: ingredient.id,
      oldValue: JSON.stringify({ currentStock: ingredient.currentStock }),
      newValue: JSON.stringify({ delta: parsed.quantity, reason: parsed.reason }),
    },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.ingredientId}`);
}

const updateIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  minLevel: z.coerce.number().min(0),
  costPerUnit: z.coerce.number().min(0),
  supplierId: z.string().optional(),
});

export async function updateIngredient(formData: FormData) {
  await requireSection("inventory");
  const parsed = updateIngredientSchema.parse(Object.fromEntries(formData));
  await prisma.ingredient.update({
    where: { id: parsed.ingredientId },
    data: { minLevel: parsed.minLevel, costPerUnit: parsed.costPerUnit, supplierId: parsed.supplierId || null },
  });
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.ingredientId}`);
}
