import { EXTERNAL_LINKS } from "@/lib/externalLinks";
import { addDays, getDayOfWeek } from "@/lib/utils";

export type Venue = {
  id: string;
  name: string;
  nameKo: string;
  href: string;
  dayOfWeek: number; // 0=Sun, 2=Tue, 6=Sat
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  timeSlot: string;
  courts: number[];  // court numbers available at this venue
};

export type CourtOption = {
  id: string;        // e.g. "fraser-heights-1"
  name: string;      // e.g. "Fraser Heights Court 1"
  nameKo: string;
  venueId: string;
  courtNumber: number;
  href: string;
  dayOfWeek: number;
  startDate: string;
  endDate: string;
  timeSlot: string;
};

export const VENUES: Venue[] = [
  {
    id: "fraser-heights",
    name: "Fraser Heights",
    nameKo: "프레이저 하이츠",
    href: EXTERNAL_LINKS.fraserHeightsCourt12,
    dayOfWeek: 2,
    startDate: "2026-06-30",
    endDate: "2026-08-18",
    timeSlot: "7:00 – 9:00 PM",
    courts: [1, 2],
  },
  {
    id: "fraser-heights-north",
    name: "Fraser Heights North",
    nameKo: "프레이저 하이츠 노스",
    href: EXTERNAL_LINKS.fraserHeightsCourtNorth,
    dayOfWeek: 0,
    startDate: "2026-06-28",
    endDate: "2026-08-16",
    timeSlot: "5:00 – 7:00 PM",
    courts: [2],
  },
  {
    id: "gates-park",
    name: "Gates Park Tennis Courts",
    nameKo: "게이츠 파크 테니스 코트",
    href: EXTERNAL_LINKS.gatesParkTennisCourts,
    dayOfWeek: 6,
    startDate: "2026-07-04",
    endDate: "2026-08-15",
    timeSlot: "6:00 – 8:00 PM",
    courts: [1, 2],
  },
];

export const COURT_OPTIONS: CourtOption[] = VENUES.flatMap((venue) =>
  venue.courts.map((n) => ({
    id: `${venue.id}-${n}`,
    name: `${venue.name} · Court ${n}`,
    nameKo: `${venue.nameKo} · 코트 ${n}`,
    venueId: venue.id,
    courtNumber: n,
    href: venue.href,
    dayOfWeek: venue.dayOfWeek,
    startDate: venue.startDate,
    endDate: venue.endDate,
    timeSlot: venue.timeSlot,
  }))
);

/**
 * Returns the first calendar date (ISO) on which the 7-day booking window
 * will include at least one available court slot — i.e. the earliest court
 * startDate minus 6 days, floored to today. Returns null if all courts are
 * past their endDate.
 */
export function getFirstBookingOpenDate(today: string, windowDays = 7): string | null {
  let earliest: string | null = null;
  for (const court of COURT_OPTIONS) {
    if (court.endDate < today) continue;
    // Walk forward from max(today, startDate) to find first matching weekday
    const scanFrom = court.startDate > today ? court.startDate : today;
    let scan = scanFrom;
    for (let i = 0; i < 7; i++) {
      if (getDayOfWeek(scan) === court.dayOfWeek) break;
      scan = addDays(scan, 1);
    }
    if (getDayOfWeek(scan) !== court.dayOfWeek) continue;
    // Booking opens (windowDays-1) days before that date
    const openIso = addDays(scan, -(windowDays - 1));
    const effective = openIso < today ? today : openIso;
    if (earliest === null || effective < earliest) earliest = effective;
  }
  return earliest;
}

/** Returns ISO date strings (YYYY-MM-DD) within [today, today+windowDays) where the court is available. */
export function getAvailableDatesForCourt(court: CourtOption, today: string, windowDays = 7): string[] {
  const results: string[] = [];
  for (let i = 0; i < windowDays; i++) {
    const iso = addDays(today, i);
    if (iso < court.startDate || iso > court.endDate) continue;
    if (getDayOfWeek(iso) !== court.dayOfWeek) continue;
    results.push(iso);
  }
  return results;
}
