"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { formatLKR, formatQty, formatDate } from "@/lib/format";
import { createPurchase, receivePurchase } from "@/app/(app)/purchases/actions";
import type { PurchaseSuggestion } from "@/lib/services/purchasing";
import type { Purchase, PurchaseItem, Supplier, Ingredient, IngredientDefinition, Location } from "@prisma/client";

type PurchaseRow = Purchase & {
  supplier: Supplier; location: Location;
  items: (PurchaseItem & { ingredient: Ingredient & { definition: IngredientDefinition } })[];
};
type IngredientRow = Ingredient & { definition: IngredientDefinition };

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "badge-neutral", ORDERED: "badge-warning", RECEIVED: "badge-success", CANCELLED: "badge-danger",
};

export function PurchasesClient({
  purchases, suppliers, ingredients, suggestions, purchaseLocationId,
}: {
  purchases: PurchaseRow[];
  suppliers: Supplier[];
  ingredients: IngredientRow[];
  suggestions: PurchaseSuggestion[];
  purchaseLocationId: string;
}) {
  const t = useT();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [prefill, setPrefill] = useState<{ ingredientId: string; quantity: number } | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t("purchases.title")}</h1>
        <button className="btn-primary" onClick={() => { setPrefill(null); setShowNew(true); }}>+ {t("purchases.newPurchaseOrder")}</button>
      </div>

      {suggestions.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("purchases.purchaseSuggestions")}</h2>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.ingredientId} className="flex flex-col gap-2 rounded-lg border border-warning-50 bg-warning-50/50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium text-slate-800">{s.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{s.reason} {s.supplierName ? `· ${s.supplierName}` : ""}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-slate-500">{t("purchases.recommended")}: <strong>{formatQty(s.recommendedQty, s.unit)}</strong></span>
                  <button
                    className="btn-secondary !py-1 !px-2.5 text-xs"
                    onClick={() => { setPrefill({ ingredientId: s.ingredientId, quantity: s.recommendedQty }); setShowNew(true); }}
                  >
                    {t("purchases.createOrder")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card !p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("purchases.orderDate")}</th><th>{t("purchases.supplier")}</th><th>{t("common.location")}</th>
              <th>Items</th><th>{t("purchases.status")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td className="text-xs text-slate-400">{formatDate(p.orderDate)}</td>
                <td>{p.supplier.name}</td>
                <td>{p.location.name}</td>
                <td className="text-xs">{p.items.map((i) => `${i.ingredient.definition.name} (${formatQty(i.quantity, i.unit)})`).join(", ")}</td>
                <td><span className={STATUS_CLASS[p.status]}>{t(`purchases.${p.status.toLowerCase()}`)}</span></td>
                <td>
                  {p.status === "ORDERED" && (
                    <button className="text-xs font-medium text-brand-600 hover:underline" onClick={async () => { await receivePurchase(p.id); router.refresh(); }}>
                      {t("purchases.markReceived")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">{t("purchases.noOrdersYet")}</td></tr>}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewPurchaseModal
          suppliers={suppliers} ingredients={ingredients} locationId={purchaseLocationId}
          prefill={prefill} onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

function NewPurchaseModal({
  suppliers, ingredients, locationId, prefill, onClose,
}: {
  suppliers: Supplier[]; ingredients: IngredientRow[]; locationId: string;
  prefill: { ingredientId: string; quantity: number } | null;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState(() => [
    prefill ?? { ingredientId: ingredients[0]?.id ?? "", quantity: 1 },
  ].map((i) => ({ ...i, unitPrice: ingredients.find((ing) => ing.id === i.ingredientId)?.costPerUnit ?? 0 })));

  function update(i: number, patch: Partial<typeof items[0]>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("purchases.newPurchaseOrder")}</h2>
        <form
          action={async (fd) => {
            fd.set("locationId", locationId);
            fd.set("items", JSON.stringify(items.map((i) => ({
              ingredientId: i.ingredientId, quantity: i.quantity, unitPrice: i.unitPrice,
              unit: ingredients.find((ing) => ing.id === i.ingredientId)?.definition.unit ?? "KG",
            }))));
            await createPurchase(fd);
            onClose();
            router.refresh();
          }}
          className="space-y-3"
        >
          <div>
            <label className="label">{t("purchases.supplier")}</label>
            <select name="supplierId" className="input" required>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">{t("purchases.deliveryDate")}</label><input name="deliveryDate" type="date" className="input" /></div>
            <div><label className="label">{t("purchases.invoiceReference")}</label><input name="invoiceRef" className="input" /></div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className="input" value={item.ingredientId} onChange={(e) => update(i, { ingredientId: e.target.value, unitPrice: ingredients.find((ing) => ing.id === e.target.value)?.costPerUnit ?? 0 })}>
                  {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.definition.name}</option>)}
                </select>
                <input type="number" step="0.01" min="0.01" className="input w-24" value={item.quantity} onChange={(e) => update(i, { quantity: parseFloat(e.target.value) || 0 })} />
                <input type="number" step="0.01" min="0" className="input w-28" value={item.unitPrice} onChange={(e) => update(i, { unitPrice: parseFloat(e.target.value) || 0 })} />
                <button type="button" className="text-xs text-danger-600 disabled:opacity-30" disabled={items.length === 1} onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>{t("common.delete")}</button>
              </div>
            ))}
            <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={() => setItems((prev) => [...prev, { ingredientId: ingredients[0]?.id ?? "", quantity: 1, unitPrice: ingredients[0]?.costPerUnit ?? 0 }])}>
              + {t("purchases.addItem")}
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
            <button type="submit" className="btn-primary">{t("purchases.createOrder")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
