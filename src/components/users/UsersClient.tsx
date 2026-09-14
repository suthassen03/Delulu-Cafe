"use client";

import { useState } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { ROLES } from "@/lib/enums";
import { createUser } from "@/app/(app)/users/actions";
import type { User, UserLocation, Location } from "@prisma/client";

type UserRow = User & { locations: (UserLocation & { location: Location })[] };

export function UsersClient({ users, locations }: { users: UserRow[]; locations: Location[] }) {
  const t = useT();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t("users.title")}</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ {t("users.addUser")}</button>
      </div>

      <div className="card !p-0">
        <table className="data-table">
          <thead><tr><th>{t("common.name")}</th><th>{t("common.email")}</th><th>{t("common.role")}</th><th>{t("common.location")}</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-slate-800">{u.name}</td>
                <td className="font-mono text-xs">{u.email}</td>
                <td><span className="badge-neutral">{t(`users.${u.role.toLowerCase()}`)}</span></td>
                <td>{u.locations.map((l) => l.location.name).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("users.addUser")}</h2>
            <form action={async (fd) => { await createUser(fd); setShowAdd(false); }} className="space-y-3">
              <div><label className="label">{t("common.name")}</label><input name="name" className="input" required /></div>
              <div><label className="label">{t("common.email")}</label><input name="email" type="email" className="input" required /></div>
              <div><label className="label">{t("common.password")}</label><input name="password" type="password" minLength={6} className="input" required /></div>
              <div>
                <label className="label">{t("common.role")}</label>
                <select name="role" className="input" required defaultValue="EMPLOYEE">
                  {ROLES.map((r) => <option key={r} value={r}>{t(`users.${r.toLowerCase()}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t("common.location")}</label>
                <div className="space-y-1">
                  {locations.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="locationIds" value={l.id} defaultChecked={locations.length === 1} /> {l.name}
                    </label>
                  ))}
                </div>
              </div>
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
