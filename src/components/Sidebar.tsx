"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { can, type Role } from "@/lib/enums";

const NAV_ITEMS: { href: string; section: string; labelKey: string; icon: string }[] = [
  { href: "/dashboard", section: "dashboard", labelKey: "nav.dashboard", icon: "▦" },
  { href: "/inventory", section: "inventory", labelKey: "nav.inventory", icon: "📦" },
  { href: "/recipes", section: "recipes", labelKey: "nav.recipes", icon: "🍽" },
  { href: "/sales", section: "sales", labelKey: "nav.sales", icon: "💳" },
  { href: "/purchases", section: "purchases", labelKey: "nav.purchases", icon: "🛒" },
  { href: "/suppliers", section: "purchases", labelKey: "nav.suppliers", icon: "🚚" },
  { href: "/stock-count", section: "stock-count", labelKey: "nav.stockCount", icon: "🔢" },
  { href: "/waste", section: "waste", labelKey: "nav.waste", icon: "🗑" },
  { href: "/alerts", section: "alerts", labelKey: "nav.alerts", icon: "🔔" },
  { href: "/reports", section: "reports", labelKey: "nav.reports", icon: "📊" },
  { href: "/ai", section: "ai", labelKey: "nav.ai", icon: "✦" },
  { href: "/users", section: "users", labelKey: "nav.users", icon: "👥" },
  { href: "/settings", section: "settings", labelKey: "nav.settings", icon: "⚙" },
];

export function Sidebar({
  role,
  businessName,
  country,
  open,
  onNavigate,
}: {
  role: Role;
  businessName: string;
  country: string;
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const t = useT();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={onNavigate} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 -translate-x-full flex-col bg-navy-950 text-slate-300 transition-transform duration-200 md:static md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            R
          </div>
          <div>
            <div className="text-sm font-semibold text-white">RoyalTech</div>
            <div className="text-[11px] text-slate-500">Smart Inventory</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV_ITEMS.filter((item) => can(role, item.section)).map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-navy-800 text-white"
                    : "text-slate-400 hover:bg-navy-900 hover:text-slate-100"
                }`}
              >
                <span className="w-4 text-center text-[13px]">{item.icon}</span>
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-navy-800 px-4 py-3">
          <div className="text-sm font-medium text-white">{businessName}</div>
          <div className="text-xs text-slate-500">{country}</div>
        </div>
      </aside>
    </>
  );
}
