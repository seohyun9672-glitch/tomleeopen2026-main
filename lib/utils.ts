import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const SITE_TIMEZONE = "America/Vancouver";

/** Returns today's date as "YYYY-MM-DD" in the site's local timezone. */
export function getToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SITE_TIMEZONE });
}

/** Returns the current year in the site's local timezone. */
export function getYear(): number {
  return parseInt(getToday().slice(0, 4), 10);
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

/** Scrolls the app's custom scroll root to the top. Use after in-page view transitions or form saves. */
export function scrollToTop(behavior: ScrollBehavior = "smooth") {
  document.querySelector<HTMLElement>("[data-app-scroll-root]")?.scrollTo({ top: 0, behavior });
}

export function formatNtrp(ntrp: string): string {
  const num = parseFloat(ntrp);
  if (isNaN(num)) return ntrp;
  return num % 1 === 0 ? num.toFixed(1) : ntrp;
}

/**
 * Format an ISO date string as a human-readable date, localized to the site's locale.
 * - `"short"` (default): "Mon, Jun 7, 2026" / "2026년 6월 7일 (월)"
 * - `"long"`: "Saturday, June 26, 2026" / "2026년 6월 26일 토요일"
 */
export function formatDateLong(iso: string, style: "short" | "long" = "short", locale: "en" | "ko" = "en"): string {
  const [ys, ms, ds] = iso.split("-");
  const y = Number(ys), m = Number(ms), d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    weekday: style,
    month: style,
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Formats a week range like "Jul 1 – Jul 7". Omits the year when both dates share the same year. */
export function formatWeekRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const [ys, ms, ds] = iso.split("-");
    const y = Number(ys), m = Number(ms), d = Number(ds);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };
  return `${fmt(start)} – ${fmt(end)}`;
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

/** Normalise a time string (HH:MM 24h or H:MM AM/PM 12h) to "HH:MM" 24h format. */
export function parseTimeToHHMM(time: string | null | undefined): string {
  if (!time) return "";
  let t = time.trim();
  // Range string (e.g. "7:00 – 9:00 PM") — extract start time + AM/PM suffix
  if (t.includes("–")) {
    const [start] = t.split("–");
    const period = t.match(/\b(am|pm)\b/i)?.[1] ?? "";
    t = period ? `${start.trim()} ${period}` : start.trim();
  }
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return t.slice(0, 5);
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const isPM = m[3].toUpperCase() === "PM";
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Format a prize amount as "$0", "$500", or "$1,500". */
export function formatPrize(amount: number): string {
  return amount === 0 ? "$0" : `$${amount.toLocaleString()}`;
}

/**
 * Returns a `rowGroupBreakBefore` function for use with TableView.
 * Inserts a thicker border above the first row of each new group.
 * `getKey` extracts the group key from each item in the sorted array.
 */
export function makeGroupBreakBefore<T>(items: T[], getKey: (item: T) => string | number): (rowIndex: number) => boolean {
  return (i) => i > 0 && getKey(items[i]) !== getKey(items[i - 1]);
}
