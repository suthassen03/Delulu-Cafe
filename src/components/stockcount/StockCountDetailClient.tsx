"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { formatLKR, formatQty } from "@/lib/format";
import { computeVariance } from "@/lib/inventory/variance";
import { submitStockCount } from "@/app/(app)/stock-count/actions";
import type { StockCount, StockCountItem, Ingredient, IngredientDefinition, Location, User } from "@prisma/client";

type ItemRow = StockCountItem & { ingredient: Ingredient & { definition: IngredientDefinition } };
type CountWithItems = StockCount & { location: Location; performedBy: User; items: ItemRow[] };

export function StockCountDetailClient({ count }: { count: CountWithItems }) {
  const t = useT();
  const router = useRouter();
  const [actuals, setActuals] = useState<Record<string, string>>(
    Object.fromEntries(count.items.map((i) => [i.id, i.actualQty != null ? String(i.actualQty) : String(i.expectedQty)]))
  );
  const [saving, setSaving] = useState(false);
  const isInProgress = count.status === "IN_PROGRESS";

  async function handleSubmit() {
    setSaving(true);
    const fd = new FormData();
    fd.set("stockCountId", count.id);
    fd.set("entries", JSON.stringify(count.items.map((i) => ({ itemId: i.id, actualQty: parseFloat(actuals[i.id]) || 0 }))));
    await submitStockCount(fd);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Link href="/stock-count" className="text-xs text-brand-600 hover:underline">← {t("stockCount.title")}</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{count.location.name} — {t("stockCount.title")}</h1>
        <span className={isInProgress ? "badge-warning" : "badge-success"}>{t(`stockCount.${isInProgress ? "inProgress" : "completed"}`)}</span>
      </div>

      <div className="card !p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("inventory.item")}</th>
              <th>{t("stockCount.expected")}</th>
              <th>{t("stockCount.actual")}</th>
              <th>{t("stockCount.difference")}</th>
              <th>{t("stockCount.percentDifference")}</th>
              <th>{t("stockCount.estimatedLoss")}</th>
            </tr>
          </thead>
          <tbody>
            {count.items.map((item) => {
              const actualQty = item.actualQty ?? (parseFloat(actuals[item.id]) || 0);
              const variance = computeVariance(item.expectedQty, actualQty, item.ingredient.costPerUnit);
              return (
                <tr key={item.id}>
                  <td className="font-medium text-slate-700">{item.ingredient.definition.name}</td>
                  <td>{formatQty(item.expectedQty, item.unit)}</td>
                  <td>
                    {isInProgress ? (
                      <input
                        type="number" step="0.01" min="0" className="input w-24"
                        value={actuals[item.id]} onChange={(e) => setActuals((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    ) : (
                      formatQty(actualQty, item.unit)
                    )}
                  </td>
                  <td className={variance.difference < 0 ? "text-danger-600" : "text-success-600"}>
                    {variance.difference >= 0 ? "+" : ""}{formatQty(variance.difference, item.unit)}
                  </td>
                  <td>{variance.percentDifference.toFixed(1)}%</td>
                  <td>{variance.estimatedLoss > 0 ? formatLKR(variance.estimatedLoss) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isInProgress && (
        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving} onClick={handleSubmit}>{t("stockCount.completeCount")}</button>
        </div>
      )}
    </div>
  );
}
