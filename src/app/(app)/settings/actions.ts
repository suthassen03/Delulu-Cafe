"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/session";

export async function updateBusinessInfo(formData: FormData) {
  const session = await requireSection("settings");
  const name = z.string().min(1).parse(formData.get("name"));
  await prisma.business.update({ where: { id: session.user.businessId }, data: { name } });
  revalidatePath("/settings");
}

export async function createCategory(formData: FormData) {
  const session = await requireSection("settings");
  const name = z.string().min(1).parse(formData.get("name"));
  await prisma.category.create({ data: { businessId: session.user.businessId, name } });
  revalidatePath("/settings");
}
