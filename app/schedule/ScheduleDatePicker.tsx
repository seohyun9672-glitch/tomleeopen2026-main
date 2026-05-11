"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFilterFieldId } from "@/app/components/FilterGroup";
import { useLocale } from "@/lib/locale-context";

type Props = {
  value: string;
  onChange: (date: string) => void;
  datesWithMatches: string[];
  scheduleYear: number;
};

function CalendarInputIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatScheduleFilterDate(iso: string): string {
  const [ys, ms, ds] = iso.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!ys || !ms || !ds || !Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleDatePicker({ value, onChange, datesWithMatches, scheduleYear }: Props) {
  const htmlFor = useFilterFieldId() ?? "";
  const { t } = useLocale();

  const dateSet = useMemo(() => new Set(datesWithMatches), [datesWithMatches]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setPickerOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  function selectDate(iso: string) {
    if (!dateSet.has(iso)) return;
    onChange(iso);
    setPickerOpen(false);
    queueMicrotask(() => buttonRef.current?.blur());
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const displayDate = value ? formatScheduleFilterDate(value) : t.schedulePage.selectDatePlaceholder;

  return (
    <div className="form-control-with-leading-icon w-full md:w-fit" ref={popoverRef}>
      <span className="form-control-leading-icon" aria-hidden>
        <CalendarInputIcon className="h-5 w-5 shrink-0" />
      </span>
      <button
        ref={buttonRef}
        id={htmlFor}
        type="button"
        onClick={() => {
          if (!pickerOpen) {
            const d = value ? new Date(value + "T12:00:00") : new Date(scheduleYear, 0, 1);
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
          }
          setPickerOpen((o) => !o);
        }}
        className="form-input-match form-control-input--with-leading-icon w-full min-w-0 text-left md:!w-fit"
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
        aria-label={t.schedulePage.chooseDateAria}
      >
        <span className="block min-w-0 truncate">{displayDate}</span>
      </button>
      {pickerOpen && (
        <div
          role="dialog"
          aria-label={t.schedulePage.calendarDialogAria}
          className="absolute top-full left-0 z-50 mt-1 min-w-[280px] rounded-xl border border-[color:var(--color-filter-outline)] bg-[var(--color-surface-card)] p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => { setViewMonth(prevMonth); setViewYear(prevYear); }}
              className="flex h-10 max-h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-filter-outline)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)]"
              aria-label={t.schedulePage.previousMonth}
            >
              ←
            </button>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{monthLabel}</span>
            <button
              type="button"
              onClick={() => { setViewMonth(nextMonth); setViewYear(nextYear); }}
              className="flex h-10 max-h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-filter-outline)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)]"
              aria-label={t.schedulePage.nextMonth}
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1 font-medium text-[var(--color-text-tertiary)]">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`pad-${i}`} className="h-8" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasMatches = dateSet.has(iso);
              const isSelected = value === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!hasMatches}
                  onClick={() => selectDate(iso)}
                  className={`h-8 rounded-lg text-sm font-medium transition-colors ${
                    !hasMatches
                      ? "cursor-not-allowed text-[color-mix(in_srgb,var(--color-text-tertiary)_72%,var(--color-background))] hover:bg-transparent"
                      : isSelected
                        ? "bg-[color-mix(in_srgb,var(--color-surface-strong)_90%,transparent)] text-[var(--color-text-primary)] ring-1 ring-inset ring-[color:var(--outline-blue-default)] hover:bg-[var(--color-surface-strong)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)]/80"
                  }`}
                  title={hasMatches ? iso : "No matches on this date"}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
