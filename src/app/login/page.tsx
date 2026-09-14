"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const DEMO_ACCOUNTS = [
  { email: "owner@delulucafe.lk", role: "Owner — all locations" },
  { email: "manager@delulucafe.lk", role: "Manager — Colombo" },
  { email: "employee@delulucafe.lk", role: "Employee — Colombo" },
];

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("owner@delulucafe.lk");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);
    if (result?.error) {
      setError(t("login.invalidCredentials"));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-white">Delulu Cafe</div>
            <div className="text-xs text-slate-400">Smart Inventory · RoyalTech</div>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="card">
          <h1 className="text-xl font-semibold text-slate-900">{t("login.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("login.subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="label">{t("common.email")}</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">{t("common.password")}</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-danger-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t("login.signingIn") : t("login.signIn")}
            </button>
          </form>

          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <div className="mb-1.5 font-medium text-slate-600">{t("login.demoAccounts")}</div>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword("password123");
                }}
                className="flex w-full items-center justify-between rounded px-1.5 py-1 text-left hover:bg-white"
              >
                <span className="font-mono">{a.email}</span>
                <span>{a.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
