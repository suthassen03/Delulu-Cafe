"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";

export function LocationSelector({
  locations,
  activeLocationId,
  canSeeAll,
}: {
  locations: { id: string; name: string }[];
  activeLocationId: string;
  canSeeAll: boolean;
}) {
  const router = useRouter();
  const t = useT();

  function onChange(value: string) {
    document.cookie = `locationId=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <select
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
      value={activeLocationId}
      onChange={(e) => onChange(e.target.value)}
    >
      {canSeeAll && <option value="ALL">{t("common.allLocations")}</option>}
      {locations.map((loc) => (
        <option key={loc.id} value={loc.id}>
          {loc.name}
        </option>
      ))}
    </select>
  );
}
