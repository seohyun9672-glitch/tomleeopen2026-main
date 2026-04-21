"use client";

import { useMemo } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import type { MatchWithTeamNames } from "@/lib/matches";
import { filterByValue } from "@/app/components/FilterControls";
import { useLocale } from "@/lib/locale-context";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { Filter } from "@/app/components/Filter";
import { MatchCard } from "@/app/components/MatchCard";
import { ScheduleDatePicker } from "./ScheduleDatePicker";

type Props = {
  allMatches: MatchWithTeamNames[];
  datesWithMatches: string[];
  defaultDate: string;
  scheduleYear: number;
};

export function ScheduleHub({ allMatches, datesWithMatches, defaultDate, scheduleYear }: Props) {
  const { t } = useLocale();
  const [dateParam, setSelectedDate] = useUrlParam("date");
  const selectedDate = dateParam || defaultDate;

  const matchesForDate = useMemo(
    () => filterByValue(allMatches, (m) => m.date, selectedDate),
    [allMatches, selectedDate]
  );

  return (
    <>
      <FilterGroup>
        <Filter control="date" htmlFor="schedule-date" label={t.shared.labels.date}>
          <ScheduleDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            datesWithMatches={datesWithMatches}
            scheduleYear={scheduleYear}
          />
        </Filter>
      </FilterGroup>
      <div className="mt-[var(--content-gap)] md:mt-[var(--section-gap)]">
        {matchesForDate.length > 0 ? (
          <ul className="space-y-4">
            {matchesForDate.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-[var(--color-text-tertiary)]">
            {t.emptyStates.noMatches}
          </div>
        )}
      </div>
    </>
  );
}
