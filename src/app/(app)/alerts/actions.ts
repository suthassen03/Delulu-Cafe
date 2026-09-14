"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { refreshAlerts } from "@/lib/services/alerts";
import type { Role } from "@/lib/enums";

export async function recomputeAlerts() {
  const session = await requireSection("alerts");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  await refreshAlerts(session.user.businessId, locationIds);
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function updateAlertStatus(alertId: string, status: "ACKNOWLEDGED" | "RESOLVED") {
  await requireSection("alerts");
  await prisma.alert.update({ where: { id: alertId }, data: { status } });
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}
