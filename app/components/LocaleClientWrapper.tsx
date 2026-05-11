"use client";

import { usePathname } from "next/navigation";
import { LocaleProvider } from "@/lib/locale-context";

export function LocaleClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initialLocale = pathname?.startsWith("/ko") ? "ko" : "en";
  return (
    <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
  );
}
