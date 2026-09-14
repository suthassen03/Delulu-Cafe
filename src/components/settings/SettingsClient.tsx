"use client";

import { useState } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { formatDateTime } from "@/lib/format";
import { updateBusinessInfo, createCategory } from "@/app/(app)/settings/actions";
import type { Business, Category, AuditLog, User, Location } from "@prisma/client";

type AuditRow = AuditLog & { user: User; location: Location | null };

export function SettingsClient({
  business, categories, auditLogs,
}: {
  business: Business;
  categories: Category[];
  auditLogs: AuditRow[];
}) {
  const t = useT();
  const [newCategory, setNewCategory] = useState("");

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">{t("settings.title")}</h1>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("settings.businessInfo")}</h2>
        <form action={updateBusinessInfo} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">{t("common.name")}</label>
            <input name="name" defaultValue={business.name} className="input w-56" />
          </div>
          <div>
            <label className="label">{t("settings.currency")}</label>
            <input disabled value={`${business.currency} — ${business.country}`} className="input w-56 bg-slate-50 text-slate-400" />
          </div>
          <button type="submit" className="btn-secondary">{t("common.save")}</button>
        </form>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("settings.categories")}</h2>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {categories.map((c) => <span key={c.id} className="badge-neutral">{c.name}</span>)}
        </div>
        <form
          action={async (fd) => { await createCategory(fd); setNewCategory(""); }}
          className="flex gap-2"
        >
          <input name="name" className="input w-56" placeholder={t("settings.addCategory")} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
          <button type="submit" className="btn-secondary">{t("common.add")}</button>
        </form>
      </div>

      <div className="card !p-0">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">{t("settings.auditLog")}</h2>
        <table className="data-table">
          <thead><tr><th>{t("common.date")}</th><th>{t("common.createdBy")}</th><th>Action</th><th>Entity</th><th>{t("common.location")}</th></tr></thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</td>
                <td>{log.user.name}</td>
                <td>{log.action}</td>
                <td>{log.entityType}</td>
                <td>{log.location?.name ?? "—"}</td>
              </tr>
            ))}
            {auditLogs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">{t("common.noData")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
