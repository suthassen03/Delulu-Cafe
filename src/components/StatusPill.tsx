"use client";

import { useT } from "@/i18n/LocaleProvider";
import type { StockStatus } from "@/lib/inventory/alerts";
import { statusBadgeClass, statusLabelKey } from "@/components/StatusBadge";

export function StatusPill({ status }: { status: StockStatus }) {
  const t = useT();
  return <span className={statusBadgeClass(status)}>{t(statusLabelKey(status))}</span>;
}
