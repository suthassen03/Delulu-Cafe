import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, type Role } from "@/lib/enums";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return session;
}

export async function requireSection(section: string) {
  const session = await requireSession();
  if (!can(session.user.role as Role, section)) {
    redirect("/dashboard");
  }
  return session;
}

/**
 * Resolves the "active" location for the current request: the cookie
 * selection if it's one the user can access, otherwise their first
 * accessible location, otherwise "ALL" (Owner-only combined view).
 */
export async function resolveActiveLocationId(businessId: string, role: Role, locationIds: string[]) {
  const cookieValue = cookies().get("locationId")?.value;
  const allLocations = await prisma.location.findMany({
    where: { businessId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const accessible = role === "OWNER" ? allLocations.map((l) => l.id) : locationIds;

  if (cookieValue === "ALL" && role === "OWNER") return { activeLocationId: "ALL" as const, allLocations };
  if (cookieValue && accessible.includes(cookieValue)) {
    return { activeLocationId: cookieValue, allLocations };
  }
  return { activeLocationId: accessible[0] ?? "ALL", allLocations };
}

/** The location id(s) a page/API route should filter its queries by. */
export function queryLocationIds(activeLocationId: string, allLocations: { id: string }[]): string[] {
  return activeLocationId === "ALL" ? allLocations.map((l) => l.id) : [activeLocationId];
}
