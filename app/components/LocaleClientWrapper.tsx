"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/lib/locale-context";

export function LocaleClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initialLocale = pathname?.startsWith("/ko") ? "ko" : "en";
  return (
    <SessionProvider>
      <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
    </SessionProvider>
  );
}
