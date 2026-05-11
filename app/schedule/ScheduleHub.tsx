"use client";

import { useMemo } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import type { MatchWithTeamNames } from "@/lib/matches";
import { useLocale } from "@/lib/locale-context";
import { FilterGroup, Filter, filterByValue, HubContent } from "@/app/components/FilterGroup";
import { ScheduleDatePicker } from "./ScheduleDatePicker";
import { MatchCard } from "@/app/components/MatchCard";

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
      <HubContent isEmpty={matchesForDate.length === 0} emptyText={t.emptyStates.noMatches}>
        <ul className="space-y-4">
          {matchesForDate.map((m) => (
            <li key={m.id}>
              <MatchCard match={m} />
            </li>
          ))}
        </ul>
      </HubContent>
    </>
  );
}
