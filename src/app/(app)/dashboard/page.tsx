import { requireSession, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { getDashboardData } from "@/lib/services/dashboard";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { Role } from "@/lib/enums";

export default async function DashboardPage() {
  const session = await requireSession();
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId,
    session.user.role as Role,
    session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  const data = await getDashboardData(session.user.businessId, locationIds);

  return <DashboardClient data={data} role={session.user.role as Role} />;
}
