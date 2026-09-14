"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { formatDateTime } from "@/lib/format";
import { recomputeAlerts, updateAlertStatus } from "@/app/(app)/alerts/actions";
import type { Alert as AlertModel, Ingredient, IngredientDefinition, Location } from "@prisma/client";

type AlertRow = AlertModel & { ingredient: (Ingredient & { definition: IngredientDefinition }) | null; location: Location };

const SEVERITY_CLASS: Record<string, string> = { INFO: "badge-neutral", WARNING: "badge-warning", CRITICAL: "badge-danger" };

export function AlertsClient({ alerts }: { alerts: AlertRow[] }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t("alerts.title")}</h1>
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={async () => { setBusy(true); await recomputeAlerts(); setBusy(false); router.refresh(); }}
        >
          {t("alerts.recompute")}
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">{t("alerts.noAlerts")}</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="card flex items-center justify-between">
              <div className="flex items-start gap-3">
                <span className={SEVERITY_CLASS[a.severity]}>{t(`alerts.types.${a.type}`)}</span>
                <div>
                  <div className="text-sm font-medium text-slate-800">{a.ingredient?.definition.name}</div>
                  <div className="text-xs text-slate-500">{a.message}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{a.location.name} · {formatDateTime(a.createdAt)}</div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  className="btn-secondary !py-1 !px-2.5 text-xs"
                  onClick={async () => { await updateAlertStatus(a.id, "ACKNOWLEDGED"); router.refresh(); }}
                >
                  {t("alerts.acknowledge")}
                </button>
                <button
                  className="btn-secondary !py-1 !px-2.5 text-xs"
                  onClick={async () => { await updateAlertStatus(a.id, "RESOLVED"); router.refresh(); }}
                >
                  {t("alerts.resolve")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
