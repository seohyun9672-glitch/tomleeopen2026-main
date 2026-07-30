"use client";

import { useEffect, useState } from "react";
import { parseTimeToHHMM } from "@/lib/utils";

// Vancouver, BC — matches SITE_TIMEZONE ("America/Vancouver") in lib/utils.ts.
const LATITUDE = 49.2827;
const LONGITUDE = -123.1207;

export type WeatherSnapshot = {
  code: number;
  tempC: number;
  isDay: boolean;
};

type DayWeather = { hours: string[]; temps: number[]; codes: number[] };

const cache = new Map<string, WeatherSnapshot | null>();
const inFlight = new Map<string, Promise<void>>();
const subscribers = new Map<string, Set<(snapshot: WeatherSnapshot | null) => void>>();

async function fetchDayWeather(date: string): Promise<DayWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&hourly=temperature_2m,weathercode&start_date=${date}&end_date=${date}&timezone=America%2FVancouver`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const hourly = data?.hourly;
    if (!Array.isArray(hourly?.time) || !Array.isArray(hourly?.temperature_2m) || !Array.isArray(hourly?.weathercode)) {
      return null;
    }
    return { hours: hourly.time, temps: hourly.temperature_2m, codes: hourly.weathercode };
  } catch {
    return null;
  }
}

function closestHourIndex(hours: string[], targetHour: number): number {
  let bestIndex = 0;
  let bestDiff = Infinity;
  hours.forEach((h, i) => {
    const hourPart = Number(h.slice(11, 13));
    const diff = Math.abs(hourPart - targetHour);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  });
  return bestIndex;
}

function notify(key: string, snapshot: WeatherSnapshot | null) {
  cache.set(key, snapshot);
  subscribers.get(key)?.forEach((fn) => fn(snapshot));
}

function ensureFetched(key: string, date: string, targetHour: number) {
  if (cache.has(key) || inFlight.has(key)) return;
  const promise = fetchDayWeather(date).then((day) => {
    inFlight.delete(key);
    if (!day || day.hours.length === 0) {
      notify(key, null);
      return;
    }
    const idx = closestHourIndex(day.hours, targetHour);
    notify(key, {
      code: day.codes[idx],
      tempC: day.temps[idx],
      isDay: targetHour >= 6 && targetHour < 20,
    });
  });
  inFlight.set(key, promise);
}

/**
 * Weather for a specific match's date/time (not "now") — Vancouver only.
 * Shared/cached per date+hour across all callers (one fetch per match day).
 */
export function useMatchWeather(date: string | null, time: string | null): WeatherSnapshot | null {
  const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  const hhmm = parseTimeToHHMM(time ?? undefined);
  const targetHour = hhmm ? Number(hhmm.slice(0, 2)) : 12;
  const key = validDate ? `${validDate}T${targetHour}` : "";

  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(cache.get(key) ?? null);

  useEffect(() => {
    if (!validDate) return;
    let set = subscribers.get(key);
    if (!set) {
      set = new Set();
      subscribers.set(key, set);
    }
    set.add(setSnapshot);
    setSnapshot(cache.get(key) ?? null);
    ensureFetched(key, validDate, targetHour);
    return () => {
      subscribers.get(key)?.delete(setSnapshot);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, validDate, targetHour]);

  return snapshot;
}
