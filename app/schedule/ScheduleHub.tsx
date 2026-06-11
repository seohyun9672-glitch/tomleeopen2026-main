"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/locale-context";
import { DatabaseLayout } from "@/app/components/database";
import { MatchCard } from "@/app/components/MatchCard";
import { getMatchCalendarIndex, type Match } from "@/lib/matches";

type Props = { allMatches: Match[] };

const today = () => new Date().toISOString().slice(0, 10);

export function ScheduleHub({ allMatches }: Props) {
  const { t } = useLocale();

  const enabledDates = useMemo(() => {
    const { yearsWithMatches, datesByYear } = getMatchCalendarIndex(allMatches);
    const thisYear = new Date().getFullYear();
    const year = yearsWithMatches.includes(thisYear) ? thisYear : (yearsWithMatches[0] ?? thisYear);
    return new Set(datesByYear[year] ?? []);
  }, [allMatches]);

  return (
    <DatabaseLayout<Match>
      data={allMatches}
      managedFilters={[
        {
          type: "date" as const,
          param: "date",
          enabledDates,
          defaultValue: (matches: Match[]) =>
            matches.map((m) => m.date).filter(Boolean).sort().at(-1) ?? today(),
          apply: (items: Match[], date: string) => items.filter((m) => m.date === date),
        },
      ]}
      view={{
        getKey: (m) => m.id,
        renderItem: (m) => <MatchCard match={m} />,
        gap: "gap-4",
      }}
      emptyText={t.emptyStates.noMatches}
    />
  );
}
