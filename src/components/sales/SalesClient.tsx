"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { formatLKR, formatDateTime } from "@/lib/format";
import { recordSale } from "@/app/(app)/sales/actions";
import type { Product, Sale, SaleItem, Location } from "@prisma/client";

type SaleWithItems = Sale & { items: (SaleItem & { product: Product })[]; location: Location };

interface Line { productId: string; quantity: number; }

export function SalesClient({
  products, recentSales, saleLocationId,
}: {
  products: Product[];
  recentSales: SaleWithItems[];
  saleLocationId: string;
}) {
  const t = useT();
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([{ productId: products[0]?.id ?? "", quantity: 1 }]);
  const [saving, setSaving] = useState(false);

  const total = lines.reduce((sum, l) => {
    const p = products.find((p) => p.id === l.productId);
    return sum + (p?.price ?? 0) * l.quantity;
  }, 0);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function handleSubmit() {
    setSaving(true);
    const fd = new FormData();
    fd.set("locationId", saleLocationId);
    fd.set("lines", JSON.stringify(lines.filter((l) => l.productId && l.quantity > 0)));
    await recordSale(fd);
    setSaving(false);
    setLines([{ productId: products[0]?.id ?? "", quantity: 1 }]);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">{t("sales.title")}</h1>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("sales.newSale")}</h2>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <select className="input" value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatLKR(p.price)}</option>)}
              </select>
              <input
                type="number" min={1} className="input w-20" value={line.quantity}
                onChange={(e) => updateLine(i, { quantity: parseInt(e.target.value) || 1 })}
              />
              <button
                className="text-xs text-danger-600 hover:underline disabled:opacity-30"
                disabled={lines.length === 1}
                onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
              >
                {t("common.delete")}
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-2 text-xs font-medium text-brand-600 hover:underline"
          onClick={() => setLines((prev) => [...prev, { productId: products[0]?.id ?? "", quantity: 1 }])}
        >
          + {t("sales.addLine")}
        </button>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="text-sm font-medium text-slate-700">{t("sales.total")}: {formatLKR(total)}</div>
          <button className="btn-primary" disabled={saving || !products.length} onClick={handleSubmit}>
            {t("sales.recordSale")}
          </button>
        </div>
      </div>

      <div className="card !p-0">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">{t("sales.recentSales")}</h2>
        <table className="data-table">
          <thead><tr><th>{t("common.date")}</th><th>{t("common.location")}</th><th>Items</th><th>{t("sales.total")}</th></tr></thead>
          <tbody>
            {recentSales.map((s) => (
              <tr key={s.id}>
                <td className="text-xs text-slate-400">{formatDateTime(s.createdAt)}</td>
                <td>{s.location.name}</td>
                <td>{s.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")}</td>
                <td className="font-medium">{formatLKR(s.total)}</td>
              </tr>
            ))}
            {recentSales.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-400">{t("sales.noSalesYet")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
