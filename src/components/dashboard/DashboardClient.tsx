"use client";

import Link from "next/link";
import { useT } from "@/i18n/LocaleProvider";
import { KpiCard } from "@/components/KpiCard";
import { formatLKR, formatPercent, formatTime } from "@/lib/format";
import { can, type Role } from "@/lib/enums";
import type { Alert as AlertModel, Ingredient, IngredientDefinition, Location, Sale, SaleItem, Product } from "@prisma/client";

type SaleWithItems = Sale & { items: (SaleItem & { product: Product })[]; location: Location };
type AlertWithIngredient = AlertModel & { ingredient: (Ingredient & { definition: IngredientDefinition }) | null; location: Location };

interface DashboardData {
  salesToday: number;
  salesChangePct: number;
  itemsInStock: number;
  openAlertsCount: number;
  expectedOutOfStock: number;
  recentSales: SaleWithItems[];
  topAlerts: AlertWithIngredient[];
}

const QUICK_ACTIONS: { key: string; href: string; icon: string; section: string }[] = [
  { key: "addInventory", href: "/inventory", icon: "📦", section: "inventory" },
  { key: "createPurchaseOrder", href: "/purchases", icon: "🛒", section: "purchases" },
  { key: "performStockCount", href: "/stock-count", icon: "🔢", section: "stock-count" },
  { key: "registerWaste", href: "/waste", icon: "🗑", section: "waste" },
  { key: "receiveDelivery", href: "/purchases", icon: "🚚", section: "purchases" },
  { key: "manageRecipes", href: "/recipes", icon: "🍽", section: "recipes" },
  { key: "viewReports", href: "/reports", icon: "📊", section: "reports" },
  { key: "askAI", href: "/ai", icon: "✦", section: "ai" },
];

export function DashboardClient({ data, role }: { data: DashboardData; role: Role }) {
  const t = useT();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">{t("dashboard.title")}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("dashboard.totalSalesToday")}
          value={formatLKR(data.salesToday)}
          trend={formatPercent(data.salesChangePct)}
          sublabel={t("dashboard.comparedToPrevious")}
          tone={data.salesChangePct >= 0 ? "success" : "danger"}
        />
        <KpiCard
          label={t("dashboard.itemsInStock")}
          value={String(data.itemsInStock)}
          sublabel={t("dashboard.activeItems")}
        />
        <KpiCard
          label={t("dashboard.alerts")}
          value={String(data.openAlertsCount)}
          sublabel={t("dashboard.itemsNeedAttention")}
          tone={data.openAlertsCount > 0 ? "warning" : "success"}
        />
        <KpiCard
          label={t("dashboard.expectedOutOfStock")}
          value={String(data.expectedOutOfStock)}
          sublabel={t("dashboard.expectedToRunOut")}
          tone={data.expectedOutOfStock > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">{t("dashboard.recentSales")}</h2>
            <Link href="/sales" className="text-xs font-medium text-brand-600 hover:underline">
              {t("common.viewAll")}
            </Link>
          </div>
          {data.recentSales.length === 0 ? (
            <p className="text-sm text-slate-400">{t("dashboard.noRecentSales")}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentSales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-mono text-xs text-slate-400">{formatTime(sale.createdAt)}</span>{" "}
                    <span className="ml-2 text-slate-700">
                      {sale.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")}
                    </span>
                    {sale.items.length > 0 && data.recentSales.some((s) => s.location) && (
                      <span className="ml-2 text-xs text-slate-400">· {sale.location.name}</span>
                    )}
                  </div>
                  <span className="font-medium text-slate-800">{formatLKR(sale.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">{t("nav.alerts")}</h2>
            <Link href="/alerts" className="text-xs font-medium text-brand-600 hover:underline">
              {t("common.viewAll")}
            </Link>
          </div>
          {data.topAlerts.length === 0 ? (
            <p className="text-sm text-slate-400">{t("alerts.noAlerts")}</p>
          ) : (
            <ul className="space-y-2.5">
              {data.topAlerts.map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="font-medium text-slate-800">{a.ingredient?.definition.name ?? t(`alerts.types.${a.type}`)}</div>
                  <div className="text-xs text-slate-500">{a.message}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("dashboard.quickActions")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.filter((a) => can(role, a.section)).map((a) => (
            <Link
              key={a.key}
              href={a.href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 py-4 text-center text-xs font-medium text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              <span className="text-lg">{a.icon}</span>
              {t(`dashboard.${a.key}`)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
