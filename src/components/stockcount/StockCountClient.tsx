"use client";

import Link from "next/link";
import { useT } from "@/i18n/LocaleProvider";
import { formatDateTime } from "@/lib/format";
import { startStockCount } from "@/app/(app)/stock-count/actions";
import type { StockCount, StockCountItem, User, Location } from "@prisma/client";

type CountRow = StockCount & { performedBy: User; location: Location; items: StockCountItem[] };

export function StockCountClient({ counts, countLocationId }: { counts: CountRow[]; countLocationId: string }) {
  const t = useT();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t("stockCount.title")}</h1>
        <button className="btn-primary" onClick={() => startStockCount(countLocationId)}>+ {t("stockCount.startCount")}</button>
      </div>

      <div className="card !p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("common.date")}</th><th>{t("common.location")}</th><th>{t("stockCount.performedBy")}</th>
              <th>Items</th><th>{t("common.status")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {counts.map((c) => (
              <tr key={c.id}>
                <td className="text-xs text-slate-400">{formatDateTime(c.createdAt)}</td>
                <td>{c.location.name}</td>
                <td>{c.performedBy.name}</td>
                <td>{c.items.length}</td>
                <td><span className={c.status === "COMPLETED" ? "badge-success" : "badge-warning"}>{t(`stockCount.${c.status === "COMPLETED" ? "completed" : "inProgress"}`)}</span></td>
                <td><Link href={`/stock-count/${c.id}`} className="text-xs font-medium text-brand-600 hover:underline">{t("common.viewAll").split(" ")[0]} →</Link></td>
              </tr>
            ))}
            {counts.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">{t("stockCount.noCountsYet")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
