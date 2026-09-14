"use client";

import { useState } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { formatLKR } from "@/lib/format";
import { createSupplier, fetchPriceHistory } from "@/app/(app)/suppliers/actions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Supplier, IngredientDefinition } from "@prisma/client";
import type { PricePoint } from "@/lib/services/priceHistory";

export function SuppliersClient({
  suppliers, definitions, initialDefinitionId, initialPriceHistory,
}: {
  suppliers: (Supplier & { _count: { ingredients: number } })[];
  definitions: IngredientDefinition[];
  initialDefinitionId: string;
  initialPriceHistory: PricePoint[];
}) {
  const t = useT();
  const [showAdd, setShowAdd] = useState(false);
  const [definitionId, setDefinitionId] = useState(initialDefinitionId);
  const [history, setHistory] = useState(initialPriceHistory);

  async function onDefinitionChange(id: string) {
    setDefinitionId(id);
    setHistory(await fetchPriceHistory(id));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t("suppliers.title")}</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ {t("suppliers.addSupplier")}</button>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("common.name")}</th><th>{t("suppliers.contactPerson")}</th><th>{t("suppliers.phone")}</th>
              <th>{t("suppliers.leadTime")}</th><th>Ingredients</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-slate-800">{s.name}</td>
                <td>{s.contactPerson ?? "—"}</td>
                <td>{s.phone ?? "—"}</td>
                <td>{s.leadTimeDays} days</td>
                <td>{s._count.ingredients}</td>
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">{t("suppliers.noSuppliersYet")}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">{t("suppliers.priceHistory")}</h2>
          <select className="input w-48" value={definitionId} onChange={(e) => onDefinitionChange(e.target.value)}>
            {definitions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">{t("common.noData")}</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatLKR(v)} width={90} />
                <Tooltip formatter={(v: number) => formatLKR(v)} />
                <Line type="monotone" dataKey="avgUnitPrice" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("suppliers.addSupplier")}</h2>
            <form action={async (fd) => { await createSupplier(fd); setShowAdd(false); }} className="space-y-3">
              <div><label className="label">{t("common.name")}</label><input name="name" className="input" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{t("suppliers.contactPerson")}</label><input name="contactPerson" className="input" /></div>
                <div><label className="label">{t("suppliers.phone")}</label><input name="phone" className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{t("common.email")}</label><input name="email" type="email" className="input" /></div>
                <div><label className="label">{t("suppliers.leadTime")}</label><input name="leadTimeDays" type="number" min="0" defaultValue="3" className="input" /></div>
              </div>
              <div><label className="label">{t("suppliers.address")}</label><input name="address" className="input" /></div>
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
