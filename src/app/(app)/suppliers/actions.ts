"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/session";
import { getPriceHistory } from "@/lib/services/priceHistory";

const schema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  leadTimeDays: z.coerce.number().int().min(0).default(3),
  minOrderValue: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export async function createSupplier(formData: FormData) {
  const session = await requireSection("purchases");
  const parsed = schema.parse(Object.fromEntries(formData));
  await prisma.supplier.create({ data: { businessId: session.user.businessId, ...parsed } });
  revalidatePath("/suppliers");
}

export async function fetchPriceHistory(definitionId: string) {
  const session = await requireSection("purchases");
  return getPriceHistory(session.user.businessId, definitionId);
}
