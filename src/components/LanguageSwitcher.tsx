"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { LOCALES, LOCALE_LABELS } from "@/i18n/messages";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
      {LOCALES.map((code) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={`rounded-md px-2.5 py-1 transition-colors ${
            locale === code
              ? "bg-white text-navy-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
          aria-pressed={locale === code}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
