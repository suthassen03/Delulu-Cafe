"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { formatLKR, formatPercent } from "@/lib/format";
import { UNITS } from "@/lib/enums";
import { UNIT_LABELS } from "@/lib/inventory/units";
import { addRecipeLine, removeRecipeLine, updateProduct } from "@/app/(app)/recipes/actions";
import type { Product, RecipeIngredient, IngredientDefinition, Category } from "@prisma/client";

type RecipeLineWithDef = RecipeIngredient & { definition: IngredientDefinition & { category: Category | null } };
type ProductWithRecipe = Product & { recipe: RecipeLineWithDef[] };

export function RecipeEditorClient({
  product, definitions, ingredientCost, profitability,
}: {
  product: ProductWithRecipe;
  definitions: IngredientDefinition[];
  ingredientCost: number;
  profitability: { grossProfit: number; foodCostPct: number };
}) {
  const t = useT();
  const router = useRouter();
  const [showAddLine, setShowAddLine] = useState(false);

  return (
    <div className="space-y-5">
      <Link href="/recipes" className="text-xs text-brand-600 hover:underline">← {t("recipes.title")}</Link>
      <h1 className="text-xl font-semibold text-slate-900">{product.name}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card"><div className="text-xs text-slate-500">{t("recipes.sellingPrice")}</div><div className="mt-1 text-lg font-semibold">{formatLKR(product.price)}</div></div>
        <div className="card"><div className="text-xs text-slate-500">{t("recipes.foodCost")}</div><div className="mt-1 text-lg font-semibold">{formatLKR(ingredientCost)}</div></div>
        <div className="card"><div className="text-xs text-slate-500">{t("recipes.grossProfit")}</div><div className={`mt-1 text-lg font-semibold ${profitability.grossProfit >= 0 ? "text-success-600" : "text-danger-600"}`}>{formatLKR(profitability.grossProfit)}</div></div>
        <div className="card"><div className="text-xs text-slate-500">{t("recipes.foodCostPercent")}</div><div className="mt-1 text-lg font-semibold">{formatPercent(profitability.foodCostPct, 1).replace("+", "")}</div></div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("recipes.editProduct")}</h2>
        <form action={updateProduct} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="productId" value={product.id} />
          <div>
            <label className="label">{t("recipes.sellingPrice")}</label>
            <input name="price" type="number" step="0.01" defaultValue={product.price} className="input w-32" />
          </div>
          <div>
            <label className="label">{t("recipes.prepWaste")}</label>
            <input name="prepWastePct" type="number" step="0.1" defaultValue={product.prepWastePct} className="input w-24" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="available" defaultChecked={product.available} /> {t("recipes.available")}
          </label>
          <button type="submit" className="btn-secondary">{t("common.save")}</button>
        </form>
      </div>

      <div className="card !p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{t("recipes.ingredients")}</h2>
          <button className="btn-secondary !py-1 !px-2.5 text-xs" onClick={() => setShowAddLine(true)}>+ {t("recipes.addIngredient")}</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("inventory.item")}</th>
              <th>{t("common.quantity")}</th>
              <th>{t("common.unit")}</th>
              <th>{t("common.category")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {product.recipe.map((line) => (
              <tr key={line.id}>
                <td className="font-medium text-slate-700">{line.definition.name}</td>
                <td>{line.quantity}</td>
                <td>{line.unit}</td>
                <td>{line.definition.category?.name ?? "—"}</td>
                <td>
                  <button
                    className="text-xs text-danger-600 hover:underline"
                    onClick={async () => { await removeRecipeLine(line.id, product.id); router.refresh(); }}
                  >
                    {t("recipes.removeIngredient")}
                  </button>
                </td>
              </tr>
            ))}
            {product.recipe.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">{t("recipes.noIngredientsYet")}</td></tr>}
          </tbody>
        </table>
      </div>

      {showAddLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("recipes.addIngredient")}</h2>
            <form
              action={async (fd) => {
                await addRecipeLine(fd);
                setShowAddLine(false);
                router.refresh();
              }}
              className="space-y-3"
            >
              <input type="hidden" name="productId" value={product.id} />
              <div>
                <label className="label">{t("inventory.item")}</label>
                <select name="definitionId" className="input" required>
                  {definitions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t("common.quantity")}</label>
                  <input name="quantity" type="number" step="0.01" min="0.01" className="input" required />
                </div>
                <div>
                  <label className="label">{t("common.unit")}</label>
                  <select name="unit" className="input" required defaultValue="G">
                    {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowAddLine(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary">{t("common.add")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
