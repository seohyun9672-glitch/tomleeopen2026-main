"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import type { Locale, Messages } from "@/lib/content";
import { siteContent } from "@/lib/content";
import {
  MATCH_ROUND_BR,
  MATCH_ROUND_FINAL,
  MATCH_ROUND_PRE,
  MATCH_ROUND_QF,
  MATCH_ROUND_SF,
  normalizeMatchRoundCode,
} from "@/lib/matchRoundCode";

function matchRoundLabel(round: string | null, m: Messages["matchUi"]): string | null {
  if (!round) return null;
  const c = normalizeMatchRoundCode(round);
  switch (c) {
    case MATCH_ROUND_PRE: return m.roundPreliminaries;
    case MATCH_ROUND_QF: return m.roundQuarterfinals;
    case MATCH_ROUND_SF: return m.roundSemifinals;
    case MATCH_ROUND_FINAL: return m.roundFinal;
    case MATCH_ROUND_BR: return m.roundBronze;
    default: return round;
  }
}

function matchStatusLabel(status: string, m: Messages["matchUi"]): string {
  switch (status) {
    case "Scheduled": return m.statusScheduled;
    case "Completed": return m.statusCompleted;
    case "Cancelled": return m.statusCancelled;
    case "Postponed": return m.statusPostponed;
    case "Pending": return m.statusPending;
    default: return status;
  }
}

export type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  matchRoundLabel: (round: string | null) => string | null;
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
      // Flush the state update synchronously so the header re-renders
      // before the navigation starts — prevents the "changes late" lag.
      flushSync(() => setLocaleState(next));
      const cleanPath =
        pathname === "/ko" ? "/" : pathname.startsWith("/ko/") ? pathname.slice(3) : pathname;
      const nextPath = next === "en" ? cleanPath : cleanPath === "/" ? "/ko" : `/ko${cleanPath}`;
      // Read from window.location.search rather than useSearchParams — useUrlParam writes
      // search params via history.replaceState which bypasses Next.js's router, so
      // useSearchParams() would return a stale snapshot and drop the active filters.
      const qs = window.location.search.slice(1);
      router.push(qs ? `${nextPath}?${qs}` : nextPath);
    },
    [router, pathname]
  );

  const value = useMemo((): LocaleContextValue => {
    const t = siteContent[locale] as unknown as Messages;
    return {
      locale,
      setLocale,
      t,
      matchRoundLabel: (round) => matchRoundLabel(round, t.matchUi),
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
