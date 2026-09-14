"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n/LocaleProvider";
import { StatusPill } from "@/components/StatusPill";
import { formatLKR, formatQty, formatDateTime } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/inventory/units";
import { UNITS, can, type Role } from "@/lib/enums";
import type { IngredientMetric } from "@/lib/services/metrics";
import { createIngredient } from "@/app/(app)/inventory/actions";

interface Props {
  metrics: IngredientMetric[];
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  role: Role;
}

export function InventoryClient({ metrics, categories, suppliers, locations, role }: Props) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    return metrics.filter((m) => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "ALL" && m.categoryName !== categoryFilter) return false;
      if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
      return true;
    });
  }, [metrics, search, categoryFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t("inventory.title")}</h1>
        {can(role, "inventory") && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + {t("inventory.addIngredient")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[10rem]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="ALL">{t("common.all")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select className="input max-w-[10rem]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">{t("common.all")}</option>
          <option value="OK">{t("inventory.ok")}</option>
          <option value="LOW">{t("inventory.low")}</option>
          <option value="CRITICAL">{t("inventory.critical")}</option>
        </select>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("inventory.item")}</th>
              <th>{t("inventory.category")}</th>
              <th>{t("inventory.currentStock")}</th>
              <th>{t("inventory.minimumLevel")}</th>
              <th>{t("inventory.expectedDaysRemaining")}</th>
              <th>{t("inventory.cost")}</th>
              <th>{t("inventory.supplier")}</th>
              <th>{t("inventory.lastUpdated")}</th>
              <th>{t("inventory.status")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/inventory/${m.id}`} className="font-medium text-brand-700 hover:underline">
                    {m.name}
                  </Link>
                </td>
                <td>{m.categoryName ?? "—"}</td>
                <td>{formatQty(m.currentStock, m.unit)}</td>
                <td>{formatQty(m.minLevel, m.unit)}</td>
                <td>{Number.isFinite(m.daysRemaining) ? Math.round(m.daysRemaining) : "—"}</td>
                <td>{formatLKR(m.costPerUnit)}</td>
                <td>{m.supplierName ?? "—"}</td>
                <td className="text-xs text-slate-400">{formatDateTime(m.updatedAt)}</td>
                <td><StatusPill status={m.status} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddIngredientModal
          categories={categories}
          suppliers={suppliers}
          locations={locations}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function AddIngredientModal({
  categories, suppliers, locations, onClose,
}: {
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("inventory.addIngredient")}</h2>
        <form
          action={async (formData) => {
            await createIngredient(formData);
            onClose();
          }}
          className="space-y-3"
        >
          <div>
            <label className="label">{t("common.location")}</label>
            <select name="locationId" className="input" required defaultValue={locations[0]?.id}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("common.name")}</label>
            <input name="name" className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("common.category")}</label>
              <select name="categoryId" className="input">
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t("common.unit")}</label>
              <select name="unit" className="input" required defaultValue="KG">
                {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">{t("inventory.currentStock")}</label>
              <input name="currentStock" type="number" step="0.01" min="0" defaultValue="0" className="input" required />
            </div>
            <div>
              <label className="label">{t("inventory.minimumLevel")}</label>
              <input name="minLevel" type="number" step="0.01" min="0" defaultValue="0" className="input" required />
            </div>
            <div>
              <label className="label">{t("inventory.cost")}</label>
              <input name="costPerUnit" type="number" step="0.01" min="0" defaultValue="0" className="input" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("inventory.supplier")}</label>
              <select name="supplierId" className="input">
                <option value="">—</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t("inventory.sku")} ({t("common.optional")})</label>
              <input name="sku" className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
            <button type="submit" className="btn-primary">{t("common.save")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
