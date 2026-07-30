"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/app/components/ui/Button";
import { formatDatePickerValue } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";

export type DatePickerProps = {
  id?: string;
  value: string; // YYYY-MM-DD or ""
  onChange: (date: string) => void;
  /**
   * When provided, only these ISO date strings are clickable.
   * All other dates are greyed out but remain visible in the calendar.
   * When undefined, every date is selectable.
   */
  enabledDates?: Set<string>;
  /** When there's no selected date yet, open the calendar to this ISO date
   * instead of today (e.g. the most recent enabled date for a sibling year
   * filter's current value). */
  defaultViewDate?: string;
  /** Whether a selected date can be cleared back to empty via an "×" button.
   * Set false when a date is always required (e.g. a schedule page that
   * always shows some date, never "no date"). Defaults to true. */
  clearable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-label-dialog"?: string;
  "aria-label-prev"?: string;
  "aria-label-next"?: string;
  className?: string;
};

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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const dow = new Date(year, month, 1).getDay(); // 0=Sun … 6=Sat
  return dow === 0 ? 6 : dow - 1; // shift to Mon=0 … Sun=6
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const POPOVER_WIDTH = 288;
const POPOVER_HEIGHT = 320; // approximate calendar height for flip calculation

function getTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DatePicker({
  id,
  value,
  onChange,
  enabledDates,
  defaultViewDate,
  clearable = true,
  placeholder = "Select date",
  disabled = false,
  "aria-label": ariaLabel,
  "aria-label-dialog": ariaLabelDialog = "Calendar",
  "aria-label-prev": ariaLabelPrev = "Previous month",
  "aria-label-next": ariaLabelNext = "Next month",
  className = "",
}: DatePickerProps) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; openUpward: boolean }>({ top: 0, left: 0, openUpward: false });
  const initialView = useCallback(() => {
    if (value) return new Date(value + "T12:00:00");
    if (defaultViewDate) return new Date(defaultViewDate + "T12:00:00");
    return new Date();
  }, [value, defaultViewDate]);
  const [viewYear, setViewYear] = useState(() => initialView().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => initialView().getMonth());

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    // Use visualViewport on mobile for accurate height (excludes browser chrome)
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const left = Math.min(rect.left, viewportWidth - POPOVER_WIDTH - 8);
    const spaceBelow = viewportHeight - rect.bottom - 8;
    const openUpward = spaceBelow < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT;
    const top = openUpward ? rect.top - POPOVER_HEIGHT - 4 : rect.bottom + 4;
    setPopoverPos({ top, left: Math.max(8, left), openUpward });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      // The calendar is portaled into document.body (so it isn't clipped by
      // scrollable ancestors), so it's not a DOM descendant of containerRef —
      // it needs its own containment check or every click inside it (e.g. a
      // day button) would register as "outside" and close the popover first.
      if (containerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    // Keep the popover anchored to its trigger as any ancestor scrolls (capture
    // phase catches scroll on nested scroll containers, e.g. a filter row),
    // instead of leaving it stranded at its original screen position.
    function handleScroll() { updatePosition(); }
    function handleResize() { updatePosition(); }
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", handleResize);
    };
  }, [open, updatePosition]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      updatePosition();
      const base = initialView();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
    setOpen((o) => !o);
  }

  function selectDate(iso: string) {
    const enabled = enabledDates === undefined || enabledDates.has(iso);
    if (!enabled) return;
    onChange(iso);
    setOpen(false);
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

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="form-input-match w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={`block min-w-0 truncate ${value && clearable ? "pr-7" : ""}`}>
          {value ? (
            formatDatePickerValue(value, locale)
          ) : (
            <span className="text-[var(--color-text-tertiary)]">{placeholder}</span>
          )}
        </span>
      </button>
      {clearable && value && !disabled && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Clear date"
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={ariaLabelDialog}
          style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, width: POPOVER_WIDTH, maxHeight: "calc(100dvh - env(safe-area-inset-bottom, 0px) - 16px)", overflowY: "auto" }}
          className="z-[9999] rounded-xl border border-[color:var(--outline-blue-default)] bg-[var(--color-surface-card)] p-3 shadow-lg"
        >
          {/* Month navigation */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <IconButton
              aria-label={ariaLabelPrev}
              icon={<ChevronLeftIcon />}
              className="rounded-lg border border-[color:var(--outline-blue-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)]"
              onClick={() => { setViewMonth(prevMonth); setViewYear(prevYear); }}
            />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {monthLabel}
            </span>
            <IconButton
              aria-label={ariaLabelNext}
              icon={<ChevronRightIcon />}
              className="rounded-lg border border-[color:var(--outline-blue-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)]"
              onClick={() => { setViewMonth(nextMonth); setViewYear(nextYear); }}
            />
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1 font-medium text-[var(--color-text-tertiary)]">{d}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`pad-${i}`} className="h-8" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const enabled = enabledDates === undefined || enabledDates.has(iso);
              const isSelected = value === iso;
              const isToday = iso === getTodayIso();
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!enabled}
                  onClick={() => selectDate(iso)}
                  className={[
                    "h-8 rounded-lg text-sm font-medium transition-colors",
                    isToday ? "ring-1 ring-inset ring-[var(--color-primary-blue-500)]" : "",
                    !enabled
                      ? "cursor-not-allowed text-[var(--color-text-tertiary)] opacity-40 hover:bg-transparent"
                      : isSelected
                        ? "bg-[var(--color-surface-strong)] text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)]",
                  ].join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          {(() => {
            const todayIso = getTodayIso();
            const todayEnabled = enabledDates === undefined || enabledDates.has(todayIso);
            return (
              <div className="mt-2 flex justify-center border-t border-[color:var(--color-border-ui)] pt-2">
                <button
                  type="button"
                  disabled={!todayEnabled}
                  onClick={() => {
                    const d = new Date();
                    setViewYear(d.getFullYear());
                    setViewMonth(d.getMonth());
                    if (todayEnabled) selectDate(todayIso);
                  }}
                  className="text-xs font-medium text-[var(--color-primary-blue-500)] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Today
                </button>
              </div>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
}
