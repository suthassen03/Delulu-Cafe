"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n/LocaleProvider";
import { formatLKR, formatPercent } from "@/lib/format";
import { can, type Role } from "@/lib/enums";
import { createProduct, toggleAvailability } from "@/app/(app)/recipes/actions";
import { useRouter } from "next/navigation";

interface ProductRow {
  id: string; name: string; price: number; prepWastePct: number; available: boolean;
  ingredientCount: number; ingredientCost: number; grossProfit: number; foodCostPct: number;
}

export function RecipesClient({ products, role, pricedAgainstAll }: { products: ProductRow[]; role: Role; pricedAgainstAll: boolean }) {
  const t = useT();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const canEdit = can(role, "recipes");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("recipes.title")}</h1>
          {pricedAgainstAll && <p className="text-xs text-slate-400">Food cost priced against your primary location.</p>}
        </div>
        {canEdit && <button className="btn-primary" onClick={() => setShowAdd(true)}>+ {t("recipes.addProduct")}</button>}
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("recipes.product")}</th>
              <th>{t("recipes.sellingPrice")}</th>
              <th>{t("recipes.foodCost")}</th>
              <th>{t("recipes.grossProfit")}</th>
              <th>{t("recipes.foodCostPercent")}</th>
              <th>{t("recipes.prepWaste")}</th>
              <th>{t("recipes.availability")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-slate-800">{p.name} <span className="text-xs text-slate-400">({p.ingredientCount})</span></td>
                <td>{formatLKR(p.price)}</td>
                <td>{formatLKR(p.ingredientCost)}</td>
                <td className={p.grossProfit >= 0 ? "text-success-600" : "text-danger-600"}>{formatLKR(p.grossProfit)}</td>
                <td>{formatPercent(p.foodCostPct, 1).replace("+", "")}</td>
                <td>{p.prepWastePct}%</td>
                <td>
                  <button
                    className={p.available ? "badge-success" : "badge-neutral"}
                    disabled={!canEdit}
                    onClick={async () => { await toggleAvailability(p.id, !p.available); router.refresh(); }}
                  >
                    {p.available ? t("recipes.available") : t("recipes.unavailable")}
                  </button>
                </td>
                <td><Link href={`/recipes/${p.id}`} className="text-xs font-medium text-brand-600 hover:underline">{t("common.edit")}</Link></td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("recipes.addProduct")}</h2>
            <form
              action={async (fd) => {
                const id = await createProduct(fd);
                setShowAdd(false);
                router.push(`/recipes/${id}`);
              }}
              className="space-y-3"
            >
              <div><label className="label">{t("common.name")}</label><input name="name" className="input" required /></div>
              <div><label className="label">{t("recipes.sellingPrice")}</label><input name="price" type="number" step="0.01" min="0" className="input" required /></div>
              <div><label className="label">{t("recipes.prepWaste")}</label><input name="prepWastePct" type="number" step="0.1" min="0" max="100" defaultValue="0" className="input" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary">{t("common.save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
