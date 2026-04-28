"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Sync locale when user navigates back/forward through browser history
  useEffect(() => {
    const onPopState = () => {
      const next: Locale = window.location.pathname.startsWith("/ko") ? "ko" : "en";
      setLocaleState(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      const nextUrl = buildPathWithLocaleAndSlug(pathname, next, window.location.search);
      const el = document.querySelector<HTMLElement>("[data-app-scroll-root]");
      if (el) {
        sessionStorage.setItem(
          "_localeScrollRestore",
          JSON.stringify({ scrollTop: el.scrollTop, forPath: nextUrl.split("?")[0] })
        );
      }
      flushSync(() => setLocaleState(next));
      window.history.pushState(null, "", nextUrl);
      router.refresh();
    },
    [pathname, router]
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
