"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import type { Role } from "@/lib/enums";

export function AppShell({
  role, businessName, country, userName, userRole, locations, activeLocationId, canSeeAll, children,
}: {
  role: Role;
  businessName: string;
  country: string;
  userName: string;
  userRole: string;
  locations: { id: string; name: string }[];
  activeLocationId: string;
  canSeeAll: boolean;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role={role} businessName={businessName} country={country} open={navOpen} onNavigate={() => setNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={userName}
          role={userRole}
          locations={locations}
          activeLocationId={activeLocationId}
          canSeeAll={canSeeAll}
          onMenuClick={() => setNavOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
