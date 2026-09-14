"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { KpiCard } from "@/components/KpiCard";
import { formatLKR, formatPercent, formatQty, formatDateTime } from "@/lib/format";
import { WASTE_REASONS } from "@/lib/enums";
import { registerWaste } from "@/app/(app)/waste/actions";
import type { Ingredient, IngredientDefinition, WasteRecord, User, Location } from "@prisma/client";

type IngredientRow = Ingredient & { definition: IngredientDefinition };
type WasteRow = WasteRecord & { ingredient: IngredientRow; employee: User; location: Location };

interface Analytics {
  todayCost: number; weekCost: number; monthCost: number; monthChangePct: number;
  wastePercentOfPurchases: number; mostWastedIngredientName: string | null; recentWaste: WasteRow[];
}

export function WasteClient({ analytics, ingredients }: { analytics: Analytics; ingredients: IngredientRow[] }) {
  const t = useT();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t("waste.title")}</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ {t("waste.registerWaste")}</button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label={t("waste.wasteToday")} value={formatLKR(analytics.todayCost)} />
        <KpiCard label={t("waste.wasteThisWeek")} value={formatLKR(analytics.weekCost)} />
        <KpiCard
          label={t("waste.wasteThisMonth")} value={formatLKR(analytics.monthCost)}
          trend={formatPercent(analytics.monthChangePct)} sublabel={t("waste.comparedToLastMonth")}
          tone={analytics.monthChangePct > 0 ? "danger" : "success"}
        />
        <KpiCard label={t("waste.mostWastedIngredient")} value={analytics.mostWastedIngredientName ?? "—"} />
        <KpiCard label={t("waste.wastePercentOfPurchases")} value={`${analytics.wastePercentOfPurchases.toFixed(1)}%`} />
      </div>

      <div className="card !p-0">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">{t("waste.recentWaste")}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("common.date")}</th><th>{t("waste.ingredient")}</th><th>{t("waste.quantity")}</th>
              <th>{t("waste.reason")}</th><th>{t("waste.employee")}</th><th>{t("common.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {analytics.recentWaste.map((w) => (
              <tr key={w.id}>
                <td className="text-xs text-slate-400">{formatDateTime(w.createdAt)}</td>
                <td className="font-medium text-slate-700">{w.ingredient.definition.name}</td>
                <td>{formatQty(w.quantity, w.unit)}</td>
                <td>{t(`waste.reasons.${w.reason}`)}</td>
                <td>{w.employee.name}</td>
                <td className="text-slate-500">{w.notes ?? "—"}</td>
              </tr>
            ))}
            {analytics.recentWaste.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("waste.registerWaste")}</h2>
            <form action={async (fd) => { await registerWaste(fd); setShowForm(false); router.refresh(); }} className="space-y-3">
              <div>
                <label className="label">{t("waste.ingredient")}</label>
                <select name="ingredientId" className="input" required>
                  {ingredients.map((i) => <option key={i.id} value={i.id}>{i.definition.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t("waste.quantity")}</label>
                <input name="quantity" type="number" step="0.01" min="0.01" className="input" required />
              </div>
              <div>
                <label className="label">{t("waste.reason")}</label>
                <select name="reason" className="input" required>
                  {WASTE_REASONS.map((r) => <option key={r} value={r}>{t(`waste.reasons.${r}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t("common.notes")} ({t("common.optional")})</label>
                <textarea name="notes" className="input" rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary">{t("common.save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
