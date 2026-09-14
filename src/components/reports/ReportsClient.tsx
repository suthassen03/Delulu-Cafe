"use client";

import Link from "next/link";
import { useT } from "@/i18n/LocaleProvider";
import { formatLKR, formatQty, formatDate } from "@/lib/format";

const TABS = ["inventoryValue", "salesReport", "purchasesReport", "wasteReport", "variance", "profitability", "supplierSpend", "stockForecast"] as const;
const PERIODS = ["today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "lastMonth"] as const;

export function ReportsClient({ tab, periodKey, data }: { tab: string; periodKey: string; data: any }) {
  const t = useT();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">{t("reports.title")}</h1>

      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {TABS.map((tKey) => (
          <Link
            key={tKey}
            href={`/reports?tab=${tKey}&period=${periodKey}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === tKey ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {t(`reports.${tKey}`)}
          </Link>
        ))}
      </div>

      {tab !== "inventoryValue" && tab !== "stockForecast" && (
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/reports?tab=${tab}&period=${p}`}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${periodKey === p ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {t(`common.${p}`)}
            </Link>
          ))}
        </div>
      )}

      <div className="card !p-0 overflow-x-auto">
        {tab === "inventoryValue" && <InventoryValueTable data={data} t={t} />}
        {tab === "salesReport" && <SalesTable data={data} t={t} />}
        {tab === "purchasesReport" && <PurchasesTable data={data} t={t} />}
        {tab === "wasteReport" && <WasteTable data={data} t={t} />}
        {tab === "variance" && <VarianceTable data={data} t={t} />}
        {tab === "profitability" && <ProfitabilityTable data={data} t={t} />}
        {tab === "supplierSpend" && <SupplierSpendTable data={data} t={t} />}
        {tab === "stockForecast" && <StockForecastTable data={data} t={t} />}
      </div>
    </div>
  );
}

function InventoryValueTable({ data, t }: { data: any; t: any }) {
  return (
    <>
      <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
        Total: {formatLKR(data.totalValue)}
      </div>
      <table className="data-table">
        <thead><tr><th>{t("inventory.item")}</th><th>{t("inventory.currentStock")}</th><th>{t("inventory.cost")}</th><th>Value</th></tr></thead>
        <tbody>
          {data.rows.map((r: any) => (
            <tr key={r.id}><td>{r.name}</td><td>{formatQty(r.currentStock, r.unit)}</td><td>{formatLKR(r.costPerUnit)}</td><td className="font-medium">{formatLKR(r.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function SalesTable({ data, t }: { data: any; t: any }) {
  return (
    <>
      <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
        {data.saleCount} sales · {formatLKR(data.totalRevenue)}
      </div>
      <table className="data-table">
        <thead><tr><th>{t("recipes.product")}</th><th>{t("common.quantity")}</th><th>Revenue</th></tr></thead>
        <tbody>
          {data.byProduct.map((p: any) => (
            <tr key={p.name}><td>{p.name}</td><td>{p.quantity}</td><td className="font-medium">{formatLKR(p.revenue)}</td></tr>
          ))}
          {data.byProduct.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>}
        </tbody>
      </table>
    </>
  );
}

function PurchasesTable({ data, t }: { data: any; t: any }) {
  return (
    <>
      <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">Total spend: {formatLKR(data.totalSpend)}</div>
      <table className="data-table">
        <thead><tr><th>{t("common.date")}</th><th>{t("purchases.supplier")}</th><th>{t("common.location")}</th><th>{t("purchases.status")}</th><th>Spend</th></tr></thead>
        <tbody>
          {data.purchases.map((p: any) => (
            <tr key={p.id}>
              <td className="text-xs text-slate-400">{formatDate(p.orderDate)}</td>
              <td>{p.supplier.name}</td><td>{p.location.name}</td><td>{t(`purchases.${p.status.toLowerCase()}`)}</td>
              <td className="font-medium">{formatLKR(p.items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0))}</td>
            </tr>
          ))}
          {data.purchases.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>}
        </tbody>
      </table>
    </>
  );
}

function WasteTable({ data, t }: { data: any; t: any }) {
  return (
    <>
      <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">Total waste cost: {formatLKR(data.totalCost)}</div>
      <table className="data-table">
        <thead><tr><th>{t("common.date")}</th><th>{t("waste.ingredient")}</th><th>{t("waste.quantity")}</th><th>{t("waste.reason")}</th><th>Cost</th></tr></thead>
        <tbody>
          {data.records.map((r: any) => (
            <tr key={r.id}>
              <td className="text-xs text-slate-400">{formatDate(r.createdAt)}</td>
              <td>{r.ingredient.definition.name}</td><td>{formatQty(r.quantity, r.unit)}</td><td>{t(`waste.reasons.${r.reason}`)}</td>
              <td className="font-medium">{formatLKR(r.quantity * r.ingredient.costPerUnit)}</td>
            </tr>
          ))}
          {data.records.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>}
        </tbody>
      </table>
    </>
  );
}

function VarianceTable({ data, t }: { data: any; t: any }) {
  return (
    <>
      <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">Total estimated loss: {formatLKR(data.totalLoss)}</div>
      <table className="data-table">
        <thead><tr><th>{t("inventory.item")}</th><th>{t("stockCount.expected")}</th><th>{t("stockCount.actual")}</th><th>{t("stockCount.difference")}</th><th>{t("stockCount.estimatedLoss")}</th></tr></thead>
        <tbody>
          {data.rows.map((r: any, i: number) => (
            <tr key={i}>
              <td>{r.name}</td><td>{formatQty(r.expected, r.unit)}</td><td>{formatQty(r.actual, r.unit)}</td>
              <td className={r.difference < 0 ? "text-danger-600" : "text-success-600"}>{r.difference >= 0 ? "+" : ""}{formatQty(r.difference, r.unit)}</td>
              <td>{r.estimatedLoss > 0 ? formatLKR(r.estimatedLoss) : "—"}</td>
            </tr>
          ))}
          {data.rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>}
        </tbody>
      </table>
    </>
  );
}

function ProfitabilityTable({ data, t }: { data: any; t: any }) {
  return (
    <table className="data-table">
      <thead><tr><th>{t("recipes.product")}</th><th>{t("recipes.sellingPrice")}</th><th>{t("recipes.foodCost")}</th><th>{t("recipes.grossProfit")}</th><th>{t("recipes.foodCostPercent")}</th><th>Qty sold</th><th>Total contribution</th></tr></thead>
      <tbody>
        {data.map((p: any) => (
          <tr key={p.id}>
            <td className="font-medium">{p.name}</td><td>{formatLKR(p.price)}</td><td>{formatLKR(p.ingredientCost)}</td>
            <td className={p.grossProfit >= 0 ? "text-success-600" : "text-danger-600"}>{formatLKR(p.grossProfit)}</td>
            <td>{p.foodCostPct.toFixed(1)}%</td><td>{p.quantitySold}</td><td className="font-medium">{formatLKR(p.totalContribution)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SupplierSpendTable({ data, t }: { data: any; t: any }) {
  return (
    <table className="data-table">
      <thead><tr><th>{t("purchases.supplier")}</th><th>Orders</th><th>Spend</th></tr></thead>
      <tbody>
        {data.map((s: any) => (
          <tr key={s.name}><td className="font-medium">{s.name}</td><td>{s.orders}</td><td>{formatLKR(s.spend)}</td></tr>
        ))}
        {data.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>}
      </tbody>
    </table>
  );
}

function StockForecastTable({ data, t }: { data: any; t: any }) {
  return (
    <table className="data-table">
      <thead><tr><th>{t("inventory.item")}</th><th>{t("inventory.currentStock")}</th><th>Avg. daily usage</th><th>{t("inventory.expectedDaysRemaining")}</th></tr></thead>
      <tbody>
        {data.map((m: any) => (
          <tr key={m.id}>
            <td className="font-medium">{m.name}</td><td>{formatQty(m.currentStock, m.unit)}</td>
            <td>{formatQty(m.avgDailyUsage14d, m.unit)}/day</td><td>{Math.round(m.daysRemaining)}</td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>}
      </tbody>
    </table>
  );
}
