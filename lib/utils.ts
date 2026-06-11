import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const SITE_TIMEZONE = "America/Vancouver";

/** Returns today's date as "YYYY-MM-DD" in the site's local timezone. */
export function getToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SITE_TIMEZONE });
}

/** Returns the day-of-week (0=Sun…6=Sat) for an ISO date string, timezone-safe. */
export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Adds `days` to an ISO date string and returns the result, timezone-safe. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Compose class names; `tailwind-merge` dedupes conflicting Tailwind utilities (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNtrp(ntrp: string): string {
  const num = parseFloat(ntrp);
  if (isNaN(num)) return ntrp;
  return num % 1 === 0 ? num.toFixed(1) : ntrp;
}

/** Format an ISO date string as a long weekday display, e.g. "Mon, Jun 7, 2026". */
export function formatDateLong(iso: string): string {
  const [ys, ms, ds] = iso.split("-");
  const y = Number(ys), m = Number(ms), d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Returns [first, second] with the male member first.
 * Falls back to the original order if gender info is missing or same.
 */
export function orderTeamMembersForDisplay<T extends { gender?: string | null }>(
  member1: T,
  member2: T | null
): [T, T | null] {
  if (!member2) return [member1, null];
  if (member2.gender === "M" && member1.gender !== "M") return [member2, member1];
  return [member1, member2];
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
