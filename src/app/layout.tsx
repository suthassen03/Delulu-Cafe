import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/Providers";
import { isLocale, DEFAULT_LOCALE } from "@/i18n/messages";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delulu Cafe — Smart Inventory",
  description: "Smart inventory, ingredient usage, purchasing and waste-control for Delulu Cafe, by RoyalTech.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLocale = cookies().get("locale")?.value;
  const initialLocale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html lang={initialLocale}>
      <body>
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
