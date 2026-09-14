import { requireSection, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { resolvePeriod, type PeriodKey } from "@/lib/dateRange";
import {
  getInventoryValueReport, getSalesReport, getPurchasesReport, getWasteReport,
  getVarianceReport, getProfitabilityReport, getSupplierSpendReport, getStockForecastReport,
} from "@/lib/services/reports";
import { ReportsClient } from "@/components/reports/ReportsClient";
import type { Role } from "@/lib/enums";

const TABS = ["inventoryValue", "salesReport", "purchasesReport", "wasteReport", "variance", "profitability", "supplierSpend", "stockForecast"] as const;
type Tab = (typeof TABS)[number];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { tab?: string; period?: string; start?: string; end?: string };
}) {
  const session = await requireSection("reports");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  const pricingLocationId = activeLocationId === "ALL" ? allLocations[0]?.id : activeLocationId;

  const tab = (TABS.includes(searchParams.tab as Tab) ? searchParams.tab : "inventoryValue") as Tab;
  const periodKey = (searchParams.period as PeriodKey) || "thisMonth";
  const range = resolvePeriod(periodKey, searchParams.start, searchParams.end);

  let data: unknown = null;
  switch (tab) {
    case "inventoryValue": data = await getInventoryValueReport(session.user.businessId, locationIds); break;
    case "salesReport": data = await getSalesReport(session.user.businessId, locationIds, range); break;
    case "purchasesReport": data = await getPurchasesReport(session.user.businessId, locationIds, range); break;
    case "wasteReport": data = await getWasteReport(session.user.businessId, locationIds, range); break;
    case "variance": data = await getVarianceReport(session.user.businessId, locationIds, range); break;
    case "profitability": data = await getProfitabilityReport(session.user.businessId, pricingLocationId, locationIds, range); break;
    case "supplierSpend": data = await getSupplierSpendReport(session.user.businessId, locationIds, range); break;
    case "stockForecast": data = await getStockForecastReport(session.user.businessId, locationIds); break;
  }

  return <ReportsClient tab={tab} periodKey={periodKey} data={data} />;
}
