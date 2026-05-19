"use client";

import { useLocale } from "@/lib/locale-context";
import { DatabaseLayout } from "@/app/components/database";
import { MatchCard } from "@/app/components/MatchCard";
import type { Match } from "@/lib/matches";

type Props = { allMatches: Match[] };

const today = () => new Date().toISOString().slice(0, 10);

export function ScheduleHub({ allMatches }: Props) {
  const { t } = useLocale();

  return (
    <DatabaseLayout<Match>
      data={allMatches}
      managedFilters={[
        {
          type: "date" as const,
          param: "date",
          matches: allMatches,
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
