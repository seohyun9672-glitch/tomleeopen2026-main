"use client";

import { Divider } from "@/app/components/ui/Divider";
import { useLocale } from "@/lib/locale-context";
import type { ImportantDateEntry } from "@/lib/importantDatesData";
import { useMemo, useState } from "react";
import { importantDates } from "@/lib/importantDatesData";
import type { Locale } from "@/lib/content";

/**
 * Same accent for calendar date cells and list dots; values match --calendar-accent-* in globals.css.
 * Indices are tied to each row’s canonical English `label` in importantDatesData.
 */
const CALENDAR_ACCENT_BG = [
  "bg-[var(--calendar-accent-0)]",
  "bg-[var(--calendar-accent-1)]",
  "bg-[var(--calendar-accent-2)]",
  "bg-[var(--calendar-accent-3)]",
  "bg-[var(--calendar-accent-4)]",
  "bg-[var(--calendar-accent-5)]",
  "bg-[var(--calendar-accent-6)]",
];

const CALENDAR_CELL_TEXT = "text-[var(--color-text-primary)]";

/** English `label` keys omitted from the home calendar grid + legend (data may still exist for other pages). */
const CALENDAR_EXCLUDED_LABELS = new Set(["Tournament"]);

/** Stable accent per important-dates row (English label key from importantDatesData). */
const CALENDAR_ACCENT_BY_LABEL: Record<string, number> = {
  Tournament: 0,
  Registration: 1,
  Preliminaries: 2,
  Quarterfinals: 3,
  Semifinals: 4,
  Final: 5,
};

const CALENDAR_ACCENT_FALLBACK_MOD = CALENDAR_ACCENT_BG.length;

function accentIndexForEntry(
  e: Extract<ImportantDateEntry, { type: "date" } | { type: "range" }>,
  orderIndex: number
): number {
  const mapped = CALENDAR_ACCENT_BY_LABEL[e.label];
  if (mapped !== undefined) return mapped;
  return orderIndex % CALENDAR_ACCENT_FALLBACK_MOD;
}

function getAccentBgClass(accentIndex: number): string {
  return CALENDAR_ACCENT_BG[accentIndex % CALENDAR_ACCENT_BG.length] ?? CALENDAR_ACCENT_BG[0];
}

function getDotColorClass(accentIndex: number): string {
  return getAccentBgClass(accentIndex);
}

function getHighlightedCellClass(accentIndex: number): string {
  return `${getAccentBgClass(accentIndex)} ${CALENDAR_CELL_TEXT}`;
}

function resolvedCalendarLabel(
  e: Extract<ImportantDateEntry, { type: "date" } | { type: "range" }>,
  locale: Locale
): string {
  if (locale === "ko" && e.labelKo?.trim()) return e.labelKo.trim();
  return e.label;
}

function resolvedCalendarValueDisplay(
  e: Extract<ImportantDateEntry, { type: "date" } | { type: "range" }>,
  locale: Locale
): string {
  if (locale === "ko" && e.valueDisplayKo?.trim()) return e.valueDisplayKo.trim();
  return e.valueDisplay;
}

function getMonthLabel(year: number, month: number, locale: Locale): string {
  const tag = locale === "ko" ? "ko-KR" : "en-US";
  return new Date(year, month, 1).toLocaleDateString(tag, {
    month: "long",
    year: "numeric",
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

type CalendarEntryResolved = {
  accentIndex: number;
  /** Index among calendar rows in `importantDates` (for tie-breaks). */
  sourceOrder: number;
  label: string;
  valueDisplay: string;
  type: "date" | "range";
  date?: string;
  startDate?: string;
  endDate?: string;
};

function getCalendarEntriesResolved(locale: Locale): CalendarEntryResolved[] {
  const result: CalendarEntryResolved[] = [];
  let orderIndex = 0;
  for (const e of importantDates) {
    if (e.type === "text") continue;
    if (CALENDAR_EXCLUDED_LABELS.has(e.label)) continue;
    const label = resolvedCalendarLabel(e, locale);
    const valueDisplay = resolvedCalendarValueDisplay(e, locale);
    const accentIndex = accentIndexForEntry(e, orderIndex);
    const sourceOrder = orderIndex;
    if (e.type === "date") {
      result.push({
        accentIndex,
        sourceOrder,
        label,
        valueDisplay,
        type: "date",
        date: e.date,
      });
    } else {
      result.push({
        accentIndex,
        sourceOrder,
        label,
        valueDisplay,
        type: "range",
        startDate: e.startDate,
        endDate: e.endDate,
      });
    }
    orderIndex++;
  }
  return result;
}

/** Length of range in days (0 for a single `date` row) — smaller = more specific when ranges overlap. */
function entrySpanDays(e: CalendarEntryResolved): number {
  if (e.type === "date") return 0;
  if (!e.startDate || !e.endDate) return Number.POSITIVE_INFINITY;
  const t0 = Date.parse(`${e.startDate}T12:00:00`);
  const t1 = Date.parse(`${e.endDate}T12:00:00`);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (t1 - t0) / 86400000);
}

/**
 * When a day falls in several calendar rows (e.g. long Tournament window + shorter Registration),
 * pick the most specific row so the cell colour matches the matching list line users read.
 */
function getEntryForCalendarDate(
  dateStr: string,
  entries: CalendarEntryResolved[]
): CalendarEntryResolved | null {
  const matches: CalendarEntryResolved[] = [];
  for (const e of entries) {
    if (e.type === "date" && e.date === dateStr) matches.push(e);
    else if (
      e.type === "range" &&
      e.startDate &&
      e.endDate &&
      dateStr >= e.startDate &&
      dateStr <= e.endDate
    ) {
      matches.push(e);
    }
  }
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;
  matches.sort((a, b) => {
    const sd = entrySpanDays(a) - entrySpanDays(b);
    if (sd !== 0) return sd;
    return b.sourceOrder - a.sourceOrder;
  });
  return matches[0]!;
}

/** Initial calendar view (year, month) from first calendar entry */
function getInitialCalendarView(entries: CalendarEntryResolved[]): { year: number; month: number } {
  const now = new Date();
  if (entries.length === 0) {
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  const first = entries[0];
  const dateStr = first.type === "date" ? first.date! : first.startDate!;
  const [y, m] = dateStr.split("-").map(Number);
  return { year: y, month: m - 1 };
}

/** Entries that fall in the given month (for list under calendar). */
function getEntriesForMonth(
  year: number,
  month: number,
  entries: CalendarEntryResolved[]
): { label: string; valueDisplay: string; accentIndex: number; sourceOrder: number }[] {
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const result: { label: string; valueDisplay: string; accentIndex: number; sourceOrder: number }[] = [];

  for (const e of entries) {
    if (e.type === "date" && e.date?.startsWith(monthKey)) {
      result.push({
        label: e.label,
        valueDisplay: e.valueDisplay,
        accentIndex: e.accentIndex,
        sourceOrder: e.sourceOrder,
      });
    }
    if (e.type === "range" && e.startDate && e.endDate) {
      const startMonth = e.startDate.slice(0, 7);
      const endMonth = e.endDate.slice(0, 7);
      if (monthKey >= startMonth && monthKey <= endMonth) {
        result.push({
          label: e.label,
          valueDisplay: e.valueDisplay,
          accentIndex: e.accentIndex,
          sourceOrder: e.sourceOrder,
        });
      }
    }
  }

  result.sort((a, b) =>
    a.sourceOrder !== b.sourceOrder ? a.sourceOrder - b.sourceOrder : a.label.localeCompare(b.label)
  );
  return result;
}

function monthHasImportantDates(
  year: number,
  month: number,
  entries: CalendarEntryResolved[]
): boolean {
  return getEntriesForMonth(year, month, entries).length > 0;
}

interface MonthCalendarProps {
  year: number;
  month: number;
  weekdayLabels: readonly string[];
  entries: CalendarEntryResolved[];
}

function MonthCalendar({ year, month, weekdayLabels, entries }: MonthCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  return (
    <div className="grid grid-cols-7 gap-px text-center text-xs">
      {weekdayLabels.map((d) => (
        <div key={d} className="py-1.5 text-inherit opacity-70 font-medium">
          {d}
        </div>
      ))}
      {Array.from({ length: firstDay }, (_, i) => (
        <div key={`pad-${i}`} className="py-1.5" />
      ))}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const entry = getEntryForCalendarDate(dateStr, entries);
        const isHighlighted = entry !== null;
        const colorClass = isHighlighted ? getHighlightedCellClass(entry!.accentIndex) : "";
        return (
          <div
            key={day}
            className={`py-1.5 rounded-md font-medium ${
              isHighlighted ? colorClass : "text-inherit"
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

  const calendarEntries = useMemo(() => getCalendarEntriesResolved(locale), [locale]);

  const initialView = useMemo(() => getInitialCalendarView(getCalendarEntriesResolved("en")), []);
  const [year, setYear] = useState(initialView.year);
  const [month, setMonth] = useState(initialView.month);

  const entriesThisMonth = useMemo(
    () => getEntriesForMonth(year, month, calendarEntries),
    [year, month, calendarEntries]
  );

  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const hasPrev = monthHasImportantDates(prevYear, prevMonth, calendarEntries);
  const hasNext = monthHasImportantDates(nextYear, nextMonth, calendarEntries);

  const goPrev = () => {
    if (!hasPrev) return;
    setYear(prevYear);
    setMonth(prevMonth);
  };

  const goNext = () => {
    if (!hasNext) return;
    setYear(nextYear);
    setMonth(nextMonth);
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      {/* Month navigation */}
      <div className="flex w-full shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev}
          className="flex h-10 max-h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-ui-strong)] text-inherit hover:bg-[var(--color-surface-hover)] disabled:pointer-events-none disabled:opacity-40"
          aria-label={t.schedulePage.previousMonth}
        >
          <span aria-hidden>←</span>
        </button>
        <p className="text-base font-semibold text-inherit min-w-[10rem] text-center">
          {getMonthLabel(year, month, locale)}
        </p>
        <button
          type="button"
          onClick={goNext}
          disabled={!hasNext}
          className="flex h-10 max-h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-ui-strong)] text-inherit hover:bg-[var(--color-surface-hover)] disabled:pointer-events-none disabled:opacity-40"
          aria-label={t.schedulePage.nextMonth}
        >
          <span aria-hidden>→</span>
        </button>
      </div>

      <div className="shrink-0">
        <MonthCalendar
          year={year}
          month={month}
          weekdayLabels={t.homePage.calendar.weekdayShort}
          entries={calendarEntries}
        />
      </div>

      <div className="min-h-0 flex-1" aria-hidden />

      {/* List only dates that fall in the currently selected month */}
      {entriesThisMonth.length > 0 && (
        <div className="shrink-0">
          <Divider />
          <ul className="space-y-2 pt-4 text-sm text-inherit opacity-80">
            {entriesThisMonth.map((entry) => (
              <li key={`${entry.sourceOrder}-${entry.label}`} className="flex flex-wrap items-center gap-x-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${getDotColorClass(entry.accentIndex)}`}
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
