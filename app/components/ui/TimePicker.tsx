"use client";

import { useEffect, useState } from "react";

export type TimePickerProps = {
  id?: string;
  value: string; // "HH:MM" (24h) or ""
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
};

function ClockIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function parse24h(v: string): { h: string; m: string; period: "AM" | "PM" } {
  const match = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { h: "", m: "", period: "AM" };
  const h24 = parseInt(match[1], 10);
  const m = match[2];
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return { h: String(h12), m, period };
}

function build24h(h: string, m: string, period: "AM" | "PM"): string {
  const hNum = parseInt(h, 10);
  const mNum = parseInt(m, 10);
  if (!h || isNaN(hNum) || hNum < 1 || hNum > 12) return "";
  if (!m || isNaN(mNum) || mNum < 0 || mNum > 59) return "";
  let h24 = hNum;
  if (period === "PM" && hNum !== 12) h24 = hNum + 12;
  if (period === "AM" && hNum === 12) h24 = 0;
  return `${String(h24).padStart(2, "0")}:${String(mNum).padStart(2, "0")}`;
}

export function TimePicker({
  id,
  value,
  onChange,
  disabled = false,
  className = "",
}: TimePickerProps) {
  const parsed = parse24h(value);
  const [h, setH] = useState(parsed.h);
  const [m, setM] = useState(parsed.m);
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.period);

  // Sync if value changes externally (e.g. form reset or defaultValues load)
  useEffect(() => {
    const p = parse24h(value);
    setH(p.h);
    setM(p.m);
    setPeriod(p.period);
  }, [value]);

  function emit(nextH: string, nextM: string, nextPeriod: "AM" | "PM") {
    onChange(build24h(nextH, nextM, nextPeriod));
  }

  function handleHChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setH(digits);
    emit(digits, m, period);
  }

  function handleHBlur() {
    if (!h && !m) onChange("");
  }

  function handleMChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setM(digits);
    emit(h, digits, period);
  }

  function handleMBlur() {
    if (h && !m) {
      setM("00");
      emit(h, "00", period);
    }
  }

  function togglePeriod() {
    const next: "AM" | "PM" = period === "AM" ? "PM" : "AM";
    setPeriod(next);
    emit(h, m, next);
  }

  const inputBase = "w-8 min-w-0 bg-transparent text-center text-[0.875rem] leading-normal text-[var(--input-text)]";

  const hasValue = !!(h || m);

  function handleClear() {
    setH(""); setM(""); setPeriod("AM");
    onChange("");
  }

  return (
    <div
      className={`relative form-control-with-leading-icon ${className}${disabled ? " opacity-50 pointer-events-none" : ""}`}
    >
      <span className="form-control-leading-icon" aria-hidden>
        <ClockIcon />
      </span>
      <div
        id={id}
        className="form-input-match form-control-input--with-leading-icon flex w-full items-center gap-0.5 focus-within:border-[color:var(--input-focus-border)] focus-within:ring-2 focus-within:ring-[color:var(--color-focus-ring)]"
      >
        <input
          type="text"
          inputMode="numeric"
          placeholder="—"
          value={h}
          onChange={(e) => handleHChange(e.target.value)}
          onBlur={handleHBlur}
          className={inputBase}
          aria-label="Hour"
          maxLength={2}
        />
        <span className="text-[var(--color-text-tertiary)] select-none">:</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="——"
          value={m}
          onChange={(e) => handleMChange(e.target.value)}
          onBlur={handleMBlur}
          className={inputBase}
          aria-label="Minute"
          maxLength={2}
        />
        <button
          type="button"
          onClick={togglePeriod}
          className="ml-1.5 rounded px-1.5 py-0.5 text-xs font-semibold transition-colors bg-[var(--color-surface-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
        >
          {period}
        </button>
      </div>
      {hasValue && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Clear time"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </div>
  );
}
