"use client";

import { signOut } from "next-auth/react";
import { useT } from "@/i18n/LocaleProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LocationSelector } from "@/components/LocationSelector";

export function Topbar({
  userName,
  role,
  locations,
  activeLocationId,
  canSeeAll,
  onMenuClick,
}: {
  userName: string;
  role: string;
  locations: { id: string; name: string }[];
  activeLocationId: string;
  canSeeAll: boolean;
  onMenuClick: () => void;
}) {
  const t = useT();

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-4 py-2 sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden"
        >
          ☰
        </button>
        <p className="hidden text-sm text-slate-400 md:block">{t("app.tagline")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <LocationSelector locations={locations} activeLocationId={activeLocationId} canSeeAll={canSeeAll} />
        <LanguageSwitcher />
        <div className="hidden h-6 w-px bg-slate-200 sm:mx-1 sm:block" />
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-slate-800">{userName}</div>
          <div className="text-xs text-slate-400">{role}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-secondary !px-2.5 !py-1.5 text-xs"
        >
          {t("common.signOut")}
        </button>
      </div>
    </header>
  );
}
