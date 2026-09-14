import en from "../../messages/en.json";
import no from "../../messages/no.json";
import ta from "../../messages/ta.json";

export const LOCALES = ["en", "no", "ta"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  no: "NO",
  ta: "தமிழ்",
};

export const DEFAULT_LOCALE: Locale = "en";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MESSAGES: Record<Locale, any> = { en, no, ta };

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
