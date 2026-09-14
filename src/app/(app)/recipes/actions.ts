"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/session";
import { UNITS } from "@/lib/enums";

const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  prepWastePct: z.coerce.number().min(0).max(100).default(0),
});

export async function createProduct(formData: FormData) {
  const session = await requireSection("recipes");
  const parsed = createProductSchema.parse(Object.fromEntries(formData));
  const product = await prisma.product.create({
    data: { businessId: session.user.businessId, name: parsed.name, price: parsed.price, prepWastePct: parsed.prepWastePct },
  });
  revalidatePath("/recipes");
  return product.id;
}

const updateProductSchema = z.object({
  productId: z.string().min(1),
  price: z.coerce.number().min(0),
  prepWastePct: z.coerce.number().min(0).max(100),
  available: z.coerce.boolean().optional(),
});

export async function updateProduct(formData: FormData) {
  await requireSection("recipes");
  const raw = Object.fromEntries(formData);
  const parsed = updateProductSchema.parse({ ...raw, available: raw.available === "on" || raw.available === "true" });
  await prisma.product.update({
    where: { id: parsed.productId },
    data: { price: parsed.price, prepWastePct: parsed.prepWastePct, available: !!parsed.available },
  });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${parsed.productId}`);
}

export async function toggleAvailability(productId: string, available: boolean) {
  await requireSection("recipes");
  await prisma.product.update({ where: { id: productId }, data: { available } });
  revalidatePath("/recipes");
}

const addLineSchema = z.object({
  productId: z.string().min(1),
  definitionId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.enum(UNITS),
});

export async function addRecipeLine(formData: FormData) {
  await requireSection("recipes");
  const parsed = addLineSchema.parse(Object.fromEntries(formData));
  await prisma.recipeIngredient.create({ data: parsed });
  revalidatePath(`/recipes/${parsed.productId}`);
}

export async function removeRecipeLine(recipeLineId: string, productId: string) {
  await requireSection("recipes");
  await prisma.recipeIngredient.delete({ where: { id: recipeLineId } });
  revalidatePath(`/recipes/${productId}`);
}
