"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/locale-context";
import { MatchCard } from "@/app/components/MatchCard";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { IconButton } from "@/app/components/ui/Button";
import { getMatchCalendarIndex, sortMatchesForDisplay, type Match } from "@/lib/matches";
import { getToday } from "@/lib/utils";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { DatabaseLayout, type FilterConfig } from "@/app/components/database/DatabaseLayout";

type Props = { allMatches: Match[] };

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ScheduleHub({ allMatches }: Props) {
  const { t } = useLocale();
  const todayStr = useMemo(() => getToday(), []);

  const calendarIndex = useMemo(() => getMatchCalendarIndex(allMatches), [allMatches]);

  const [params, setParam] = useUrlParams(["date"] as const);

  const enabledDates = useMemo(
    () => new Set(Object.values(calendarIndex.datesByYear).flat()),
    [calendarIndex],
  );

  const allDatesSorted = useMemo(
    () => Object.values(calendarIndex.datesByYear).flat().sort(),
    [calendarIndex],
  );

  // If today has no matches, default to the next upcoming match date
  // (or the most recent past date if none remain).
  const defaultDate = useMemo(() => {
    if (allDatesSorted.length === 0) return todayStr;
    if (enabledDates.has(todayStr)) return todayStr;
    return allDatesSorted.find((d) => d > todayStr) ?? allDatesSorted[allDatesSorted.length - 1];
  }, [allDatesSorted, enabledDates, todayStr]);

  const selectedDate = params.date || defaultDate;
  const prevDate = [...allDatesSorted].reverse().find((d) => d < selectedDate) ?? null;
  const nextDate = allDatesSorted.find((d) => d > selectedDate) ?? null;

  const dayMatches = useMemo(() => {
    const filtered = allMatches.filter((m) => m.date === selectedDate);
    return sortMatchesForDisplay(filtered);
  }, [allMatches, selectedDate]);

  const isEmpty = dayMatches.length === 0;

  const filters: FilterConfig[] = [];

  return (
    <DatabaseLayout filters={filters}>
      <div className="flex w-full min-w-0 items-center gap-2 mb-[var(--content-gap)]">
        <IconButton
          variant="transparent"
          aria-label="Previous date"
          disabled={!prevDate}
          onClick={() => prevDate && setParam("date", prevDate)}
        >
          <ChevronLeftIcon />
        </IconButton>
        <DatePicker
          value={selectedDate}
          onChange={(v) => setParam("date", v || defaultDate)}
          enabledDates={enabledDates}
          placeholder={t.schedulePage.selectDatePlaceholder}
          aria-label={t.schedulePage.chooseDateAria}
          aria-label-dialog={t.schedulePage.calendarDialogAria}
          aria-label-prev={t.schedulePage.previousMonth}
          aria-label-next={t.schedulePage.nextMonth}
          className="flex-1 min-w-0"
        />
        <IconButton
          variant="transparent"
          aria-label="Next date"
          disabled={!nextDate}
          onClick={() => nextDate && setParam("date", nextDate)}
        >
          <ChevronRightIcon />
        </IconButton>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-sm text-[var(--color-text-tertiary)]">
          {t.emptyStates.noMatches}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {dayMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </DatabaseLayout>
  );
}
