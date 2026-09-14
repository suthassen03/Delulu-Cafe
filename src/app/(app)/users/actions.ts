"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/session";
import { ROLES } from "@/lib/enums";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ROLES),
  locationIds: z.array(z.string()).min(1),
});

export async function createUser(formData: FormData) {
  const session = await requireSection("users");
  const parsed = schema.parse({
    name: formData.get("name"), email: formData.get("email"), password: formData.get("password"),
    role: formData.get("role"), locationIds: formData.getAll("locationIds"),
  });

  const passwordHash = await bcrypt.hash(parsed.password, 10);
  await prisma.user.create({
    data: {
      businessId: session.user.businessId, name: parsed.name, email: parsed.email.toLowerCase(),
      passwordHash, role: parsed.role,
      locations: { create: parsed.locationIds.map((locationId) => ({ locationId })) },
    },
  });

  revalidatePath("/users");
}
