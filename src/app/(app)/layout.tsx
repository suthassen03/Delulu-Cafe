import { requireSession, resolveActiveLocationId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import type { Role } from "@/lib/enums";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const business = await prisma.business.findUniqueOrThrow({ where: { id: session.user.businessId } });
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId,
    session.user.role as Role,
    session.user.locationIds
  );
  const accessibleLocations =
    session.user.role === "OWNER"
      ? allLocations
      : allLocations.filter((l) => session.user.locationIds.includes(l.id));

  return (
    <AppShell
      role={session.user.role as Role}
      businessName={business.name}
      country={business.country}
      userName={session.user.name}
      userRole={session.user.role}
      locations={accessibleLocations}
      activeLocationId={activeLocationId}
      canSeeAll={session.user.role === "OWNER"}
    >
      {children}
    </AppShell>
  );
}
