import { requireSection, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { refreshAlerts, getOpenAlerts } from "@/lib/services/alerts";
import { AlertsClient } from "@/components/alerts/AlertsClient";
import type { Role } from "@/lib/enums";

export default async function AlertsPage() {
  const session = await requireSection("alerts");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  await refreshAlerts(session.user.businessId, locationIds);
  const alerts = await getOpenAlerts(session.user.businessId, locationIds);

  return <AlertsClient alerts={alerts} />;
}
