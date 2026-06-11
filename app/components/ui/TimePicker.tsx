"use client";

import { useEffect, useState } from "react";

export type TimePickerProps = {
  id?: string;
  value: string; // "HH:MM" (24h) or ""
  onChange: (time: string) => void;
  placeholder?: string;
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
    const built = build24h(nextH, nextM, nextPeriod);
    if (built) onChange(built);
  }

  function handleHChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setH(digits);
    emit(digits, m, period);
  }

  function handleMChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setM(digits);
    emit(h, digits, period);
  }

  function togglePeriod() {
    const next: "AM" | "PM" = period === "AM" ? "PM" : "AM";
    setPeriod(next);
    emit(h, m, next);
  }

  const inputBase = "w-8 min-w-0 bg-transparent text-center text-[0.875rem] leading-normal text-[var(--input-text)]";

  return (
    <div
      className={`form-control-with-leading-icon ${className}`}
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
    </div>
  );
}
