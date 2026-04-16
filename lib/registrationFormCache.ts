/**
 * Module-level cache for registration form static data (categories + clubs).
 * Fetched once per page load; reused on subsequent modal opens.
 */
import type { CategoryRecord } from "@/lib/categories/types";

type FormStaticData = {
  categories: CategoryRecord[];
  clubCodes: string[];
};

let cached: FormStaticData | null = null;
let inflight: Promise<FormStaticData> | null = null;

export async function loadRegistrationFormData(): Promise<FormStaticData> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = Promise.all([
    fetch("/api/clubs").then((r) => (r.ok ? r.json() : [])),
    fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
  ]).then(([clubs, categories]) => {
    const data: FormStaticData = {
      categories: categories as CategoryRecord[],
      clubCodes: (clubs as { code: string }[]).map((c) => c.code),
    };
    cached = data;
    inflight = null;
    return data;
  }).catch(() => {
    inflight = null;
    return { categories: [], clubCodes: [] };
  });

  return inflight;
}

/** Pre-warm the cache (call from parent component on hover/focus). */
export function prefetchRegistrationFormData(): void {
  void loadRegistrationFormData();
}
