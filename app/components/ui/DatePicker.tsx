"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/app/components/ui/Button";
import { formatDateLong } from "@/lib/utils";

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
  placeholder?: string;
  "aria-label"?: string;
  "aria-label-dialog"?: string;
  "aria-label-prev"?: string;
  "aria-label-next"?: string;
  className?: string;
};

function CalendarIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

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
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const POPOVER_WIDTH = 288;

export function DatePicker({
  id,
  value,
  onChange,
  enabledDates,
  placeholder = "Select date",
  "aria-label": ariaLabel,
  "aria-label-dialog": ariaLabelDialog = "Calendar",
  "aria-label-prev": ariaLabelPrev = "Previous month",
  "aria-label-next": ariaLabelNext = "Next month",
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [viewYear, setViewYear] = useState(() => {
    const base = value ? new Date(value + "T12:00:00") : new Date();
    return base.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const base = value ? new Date(value + "T12:00:00") : new Date();
    return base.getMonth();
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function handleScroll(e: Event) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function handleResize() { setOpen(false); }
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8);
      setPopoverPos({ top: rect.bottom + 4, left: Math.max(8, left) });
      const base = value ? new Date(value + "T12:00:00") : new Date();
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
    <div className={`form-control-with-leading-icon ${className}`} ref={containerRef}>
      <span className="form-control-leading-icon" aria-hidden>
        <CalendarIcon />
      </span>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={handleToggle}
        className="form-input-match form-control-input--with-leading-icon w-full text-left"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="block min-w-0 truncate">
          {value ? (
            formatDateLong(value)
          ) : (
            <span className="text-[var(--color-text-tertiary)]">{placeholder}</span>
          )}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={ariaLabelDialog}
          style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, width: POPOVER_WIDTH }}
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
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!enabled}
                  onClick={() => selectDate(iso)}
                  className={[
                    "h-8 rounded-lg text-sm font-medium transition-colors",
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
        </div>
      )}
    </div>
  );
}
