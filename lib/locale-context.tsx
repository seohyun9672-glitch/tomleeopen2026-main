"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import type { Locale, Messages } from "@/lib/content";
import { siteContent } from "@/lib/content";
import { buildPathWithLocaleAndSlug } from "@/lib/filterState";

function matchStatusLabel(status: string, m: Messages["matchUi"]): string {
  switch (status) {
    case "Scheduled": return m.statusScheduled;
    case "Completed": return m.statusCompleted;
    case "Cancelled": return m.statusCancelled;
    case "Postponed": return m.statusPostponed;
    case "Pending":   return m.statusPending;
    default:          return status;
  }
}

export type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  matchStatusLabel: (status: string) => string;
  registrationStatusLabel: (effective: "Confirmed" | "Cancelled") => string;
  clubDisplayName: (club: { name: string; nameKo: string | null }) => string;
  playerDisplayName: (player: { fullNameEn: string; fullNameKo: string | null }) => string;
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
    return {
      locale,
      setLocale,
      t,
      matchStatusLabel: (status) => matchStatusLabel(status, t.matchUi),
      registrationStatusLabel: (effective) =>
        effective === "Cancelled"
          ? t.registrationForm.options.statusCancelled
          : t.registrationForm.options.statusConfirmed,
      clubDisplayName: (club) =>
        locale === "ko" && club.nameKo?.trim() ? club.nameKo.trim() : club.name,
      playerDisplayName: (player) =>
        locale === "ko" && player.fullNameKo?.trim()
          ? player.fullNameKo.trim()
          : player.fullNameEn?.trim() || player.fullNameKo?.trim() || "",
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
