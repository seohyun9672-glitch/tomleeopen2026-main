"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import type { Locale, Messages } from "@/lib/content";
import { siteContent } from "@/lib/content";
import { buildPathWithLocaleAndSlug } from "@/lib/filterState";

export type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      flushSync(() => setLocaleState(next));
      const nextUrl = buildPathWithLocaleAndSlug(pathname, next, window.location.search);
      router.push(nextUrl);
    },
    [router, pathname]
  );

  const value = useMemo((): LocaleContextValue => {
    const t = siteContent[locale] as unknown as Messages;
    return { locale, setLocale, t };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
