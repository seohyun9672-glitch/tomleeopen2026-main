"use client";

import { useMemo, useState } from "react";

import { Divider } from "@/app/components/ui/Divider";
import type { Locale } from "@/lib/content";
import type { ImportantDateEntry } from "@/lib/importantDatesData";
import { getImportantDates } from "@/lib/importantDatesData";
import { getYear } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import { getToday } from "@/lib/utils";

const CALENDAR_ACCENT_BG = [
  "bg-[var(--calendar-accent-0)]",
  "bg-[var(--calendar-accent-1)]",
  "bg-[var(--calendar-accent-2)]",
  "bg-[var(--calendar-accent-3)]",
  "bg-[var(--calendar-accent-4)]",
  "bg-[var(--calendar-accent-5)]",
  "bg-[var(--calendar-accent-6)]",
] as const;

const CALENDAR_CELL_TEXT = "text-[var(--color-text-primary)]";
const CALENDAR_EXCLUDED_LABELS = new Set(["Tournament"]);


type CalendarSourceEntry = Extract<ImportantDateEntry, { type: "date" } | { type: "range" }>;

type CalendarEntryResolved = {
  accentIndex: number;
  sourceOrder: number;
  label: string;
  valueDisplay: string;
  type: "date" | "range";
  date?: string;
  startDate?: string;
  endDate?: string;
};

type MonthListEntry = Pick<
  CalendarEntryResolved,
  "label" | "valueDisplay" | "accentIndex" | "sourceOrder"
>;

function resolveLocalizedText(
  locale: Locale,
  primary: string,
  localized?: string | null
): string {
  if (locale === "ko" && localized?.trim()) return localized.trim();
  return primary;
}

function getAccentClass(index: number): string {
  return CALENDAR_ACCENT_BG[index % CALENDAR_ACCENT_BG.length] ?? CALENDAR_ACCENT_BG[0];
}

function getHighlightedCellClass(index: number): string {
  return `${getAccentClass(index)} ${CALENDAR_CELL_TEXT}`;
}

function getAccentIndex(_entry: CalendarSourceEntry, orderIndex: number): number {
  return orderIndex % CALENDAR_ACCENT_BG.length;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getMonthLabel(year: number, month: number, locale: Locale): string {
  return new Date(year, month, 1).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarEntries(locale: Locale): CalendarEntryResolved[] {
  const result: CalendarEntryResolved[] = [];
  let sourceOrder = 0;

  for (const entry of getImportantDates(getYear())) {
    if (entry.type === "text") continue;
    if (CALENDAR_EXCLUDED_LABELS.has(entry.label)) continue;

    const accentIndex = getAccentIndex(entry, sourceOrder);

    result.push({
      accentIndex,
      sourceOrder,
      label: resolveLocalizedText(locale, entry.label, entry.labelKo),
      valueDisplay: resolveLocalizedText(locale, entry.valueDisplay, entry.valueDisplayKo),
      type: entry.type,
      ...(entry.type === "date"
        ? { date: entry.date }
        : { startDate: entry.startDate, endDate: entry.endDate }),
    });

    sourceOrder++;
  }

  return result;
}

function getEntrySpanDays(entry: CalendarEntryResolved): number {
  if (entry.type === "date") return 0;
  if (!entry.startDate || !entry.endDate) return Number.POSITIVE_INFINITY;

  const start = Date.parse(`${entry.startDate}T12:00:00`);
  const end = Date.parse(`${entry.endDate}T12:00:00`);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (end - start) / 86400000);
}

function getEntryForDate(
  dateStr: string,
  entries: CalendarEntryResolved[]
): CalendarEntryResolved | null {
  const matches = entries.filter((entry) => {
    if (entry.type === "date") return entry.date === dateStr;
    return !!entry.startDate && !!entry.endDate && dateStr >= entry.startDate && dateStr <= entry.endDate;
  });

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0] ?? null;

  return [...matches].sort((a, b) => {
    const spanDiff = getEntrySpanDays(a) - getEntrySpanDays(b);
    if (spanDiff !== 0) return spanDiff;
    return b.sourceOrder - a.sourceOrder;
  })[0] ?? null;
}

function getEntriesForMonth(
  year: number,
  month: number,
  entries: CalendarEntryResolved[]
): MonthListEntry[] {
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  return entries
    .filter((entry) => {
      if (entry.type === "date") {
        return entry.date?.startsWith(monthKey);
      }

      if (!entry.startDate || !entry.endDate) return false;

      const startMonth = entry.startDate.slice(0, 7);
      const endMonth = entry.endDate.slice(0, 7);

      return monthKey >= startMonth && monthKey <= endMonth;
    })
    .map(({ label, valueDisplay, accentIndex, sourceOrder }) => ({
      label,
      valueDisplay,
      accentIndex,
      sourceOrder,
    }))
    .sort((a, b) => {
      if (a.sourceOrder !== b.sourceOrder) return a.sourceOrder - b.sourceOrder;
      return a.label.localeCompare(b.label);
    });
}

function hasEntriesInMonth(year: number, month: number, entries: CalendarEntryResolved[]): boolean {
  return getEntriesForMonth(year, month, entries).length > 0;
}

function getInitialCalendarView(entries: CalendarEntryResolved[]): { year: number; month: number } {
  const todayParts = getToday().split("-").map(Number);
  const nowYear = todayParts[0];
  const nowMonth = todayParts[1] - 1;

  if (entries.length === 0) {
    return { year: nowYear, month: nowMonth };
  }

  const firstDate = entries[0]?.type === "date" ? entries[0].date : entries[0]?.startDate;
  if (!firstDate) {
    return { year: nowYear, month: nowMonth };
  }

  const [year, month] = firstDate.split("-").map(Number);
  return { year, month: month - 1 };
}

type MonthCalendarProps = {
  year: number;
  month: number;
  weekdayLabels: readonly string[];
  entries: CalendarEntryResolved[];
};

function MonthCalendar({ year, month, weekdayLabels, entries }: MonthCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  return (
    <div className="grid grid-cols-7 gap-px text-center text-xs">
      {weekdayLabels.map((label) => (
        <div key={label} className="py-1.5 font-medium text-inherit opacity-70">
          {label}
        </div>
      ))}

      {Array.from({ length: firstDay }, (_, index) => (
        <div key={`pad-${index}`} className="py-1.5" />
      ))}

      {Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const entry = getEntryForDate(dateStr, entries);

        return (
          <div
            key={day}
            className={`rounded-md py-1.5 font-medium ${
              entry ? getHighlightedCellClass(entry.accentIndex) : "text-inherit"
            }`}
            title={entry ? `${entry.label}: ${entry.valueDisplay}` : undefined}
          >
            {day}
          </div>
        );
      })}
    </div>
  );
}

export function TournamentCalendar() {
  const { t, locale } = useLocale();

  const calendarEntries = useMemo(() => getCalendarEntries(locale), [locale]);

  const initialView = useMemo(
    () => getInitialCalendarView(getCalendarEntries("en")),
    []
  );

  const [view, setView] = useState(initialView);

  const entriesThisMonth = useMemo(
    () => getEntriesForMonth(view.year, view.month, calendarEntries),
    [view, calendarEntries]
  );

  const prevView = view.month === 0
    ? { year: view.year - 1, month: 11 }
    : { year: view.year, month: view.month - 1 };

  const nextView = view.month === 11
    ? { year: view.year + 1, month: 0 }
    : { year: view.year, month: view.month + 1 };

  const hasPrev = hasEntriesInMonth(prevView.year, prevView.month, calendarEntries);
  const hasNext = hasEntriesInMonth(nextView.year, nextView.month, calendarEntries);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <div className="mx-[calc(-1*var(--calendar-card-padding))] mt-[calc(-1*var(--calendar-card-padding))] flex w-[calc(100%+2*var(--calendar-card-padding))] shrink-0 items-center justify-between gap-2 border-b border-[color:var(--color-border-ui)] px-[var(--calendar-card-padding)] pb-[var(--content-gap)] pt-[var(--calendar-card-padding)]">
        <button
          type="button"
          onClick={() => hasPrev && setView(prevView)}
          disabled={!hasPrev}
          className="flex h-10 max-h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-ui-strong)] text-inherit hover:bg-[var(--color-surface-hover)] disabled:pointer-events-none disabled:opacity-40"
          aria-label={t.schedulePage.previousMonth}
        >
          <span aria-hidden>←</span>
        </button>

        <p className="min-w-[10rem] text-center text-base font-semibold text-inherit">
          {getMonthLabel(view.year, view.month, locale)}
        </p>

        <button
          type="button"
          onClick={() => hasNext && setView(nextView)}
          disabled={!hasNext}
          className="flex h-10 max-h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-ui-strong)] text-inherit hover:bg-[var(--color-surface-hover)] disabled:pointer-events-none disabled:opacity-40"
          aria-label={t.schedulePage.nextMonth}
        >
          <span aria-hidden>→</span>
        </button>
      </div>

      <div className="shrink-0">
        <MonthCalendar
          year={view.year}
          month={view.month}
          weekdayLabels={t.homePage.calendar.weekdayShort}
          entries={calendarEntries}
        />
      </div>

      <div className="min-h-0 flex-1" aria-hidden />

      {entriesThisMonth.length > 0 && (
        <div className="shrink-0">
          <Divider />
          <ul className="space-y-2 pt-4 text-sm text-inherit opacity-80">
            {entriesThisMonth.map((entry) => (
              <li key={`${entry.sourceOrder}-${entry.label}`} className="flex flex-wrap items-center gap-x-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${getAccentClass(entry.accentIndex)}`}
                  aria-hidden
                />
                <span className="font-medium text-inherit">{entry.label}:</span>
                <span>{entry.valueDisplay}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}