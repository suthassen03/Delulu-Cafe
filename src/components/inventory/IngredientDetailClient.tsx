"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n/LocaleProvider";
import { StatusPill } from "@/components/StatusPill";
import { formatLKR, formatQty, formatDateTime } from "@/lib/format";
import type { IngredientMetric } from "@/lib/services/metrics";
import type { InventoryTransaction } from "@prisma/client";
import { adjustStock, updateIngredient } from "@/app/(app)/inventory/actions";

export function IngredientDetailClient({
  metric, transactions, suppliers,
}: {
  metric: IngredientMetric;
  transactions: InventoryTransaction[];
  suppliers: { id: string; name: string }[];
}) {
  const t = useT();
  const [showAdjust, setShowAdjust] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/inventory" className="text-xs text-brand-600 hover:underline">← {t("nav.inventory")}</Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">{metric.name}</h1>
          <StatusPill status={metric.status} />
        </div>
        <p className="text-sm text-slate-500">{metric.locationName} · {metric.categoryName ?? "—"}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card"><div className="text-xs text-slate-500">{t("inventory.currentStock")}</div><div className="mt-1 text-lg font-semibold">{formatQty(metric.currentStock, metric.unit)}</div></div>
        <div className="card"><div className="text-xs text-slate-500">{t("inventory.minimumLevel")}</div><div className="mt-1 text-lg font-semibold">{formatQty(metric.minLevel, metric.unit)}</div></div>
        <div className="card"><div className="text-xs text-slate-500">{t("inventory.expectedDaysRemaining")}</div><div className="mt-1 text-lg font-semibold">{Number.isFinite(metric.daysRemaining) ? Math.round(metric.daysRemaining) : "—"}</div></div>
        <div className="card"><div className="text-xs text-slate-500">{t("inventory.cost")}</div><div className="mt-1 text-lg font-semibold">{formatLKR(metric.costPerUnit)}</div></div>
      </div>

      <div className="card">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><div className="text-xs text-slate-500">{t("common.unit")}</div><div>{metric.unit}</div></div>
          <div><div className="text-xs text-slate-500">{t("inventory.supplier")}</div><div>{metric.supplierName ?? "—"}</div></div>
          <div><div className="text-xs text-slate-500">Avg. daily usage (14d)</div><div>{formatQty(metric.avgDailyUsage14d, metric.unit)}/day</div></div>
          <div><div className="text-xs text-slate-500">{t("inventory.lastUpdated")}</div><div>{formatDateTime(metric.updatedAt)}</div></div>
        </div>
        <div className="mt-4">
          <button className="btn-secondary" onClick={() => setShowAdjust(true)}>{t("common.edit")} / Adjust stock</button>
        </div>
      </div>

      <div className="card !p-0">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">{t("inventory.history")}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("common.date")}</th>
              <th>Type</th>
              <th>{t("common.quantity")}</th>
              <th>{t("common.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="text-xs text-slate-400">{formatDateTime(tx.createdAt)}</td>
                <td>{tx.type.replace(/_/g, " ")}</td>
                <td className={tx.quantity >= 0 ? "text-success-600" : "text-danger-600"}>
                  {tx.quantity >= 0 ? "+" : ""}{formatQty(tx.quantity, metric.unit)}
                </td>
                <td className="text-slate-500">{tx.note ?? "—"}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdjust && (
        <AdjustModal ingredientId={metric.id} suppliers={suppliers} minLevel={metric.minLevel} costPerUnit={metric.costPerUnit} onClose={() => setShowAdjust(false)} />
      )}
    </div>
  );
}

function AdjustModal({
  ingredientId, suppliers, minLevel, costPerUnit, onClose,
}: {
  ingredientId: string;
  suppliers: { id: string; name: string }[];
  minLevel: number;
  costPerUnit: number;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Adjust stock</h2>
          <form action={async (fd) => { await adjustStock(fd); onClose(); }} className="space-y-3">
            <input type="hidden" name="ingredientId" value={ingredientId} />
            <div>
              <label className="label">Quantity (+/-)</label>
              <input name="quantity" type="number" step="0.01" className="input" required />
            </div>
            <div>
              <label className="label">{t("inventory.history")} {t("common.notes")}</label>
              <input name="reason" className="input" required placeholder="e.g. Manual correction after damage" />
            </div>
            <button type="submit" className="btn-primary w-full">{t("common.save")}</button>
          </form>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("inventory.editIngredient")}</h2>
          <form action={async (fd) => { await updateIngredient(fd); onClose(); }} className="space-y-3">
            <input type="hidden" name="ingredientId" value={ingredientId} />
            <div>
              <label className="label">{t("inventory.minimumLevel")}</label>
              <input name="minLevel" type="number" step="0.01" defaultValue={minLevel} className="input" required />
            </div>
            <div>
              <label className="label">{t("inventory.cost")}</label>
              <input name="costPerUnit" type="number" step="0.01" defaultValue={costPerUnit} className="input" required />
            </div>
            <div>
              <label className="label">{t("inventory.supplier")}</label>
              <select name="supplierId" className="input">
                <option value="">—</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-secondary w-full">{t("common.save")}</button>
          </form>
        </div>
        <button className="text-xs text-slate-400 hover:underline" onClick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  );
}
