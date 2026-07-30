/**
 * Shared URL-based filter state utilities.
 *
 * URL search params are the single source of truth for all filter state.
 * These functions are pure (no side effects) except for updateFiltersInUrl,
 * which mutates the browser history entry without triggering a navigation.
 *
 * Usage contract:
 *  - Call parseFiltersFromSearchParams to hydrate UI from the URL on render.
 *  - Call mergeFilterParams to compose a new params object without losing
 *    unrelated params.
 *  - Call updateFiltersInUrl to commit filter changes to the URL.
 *  - Call buildPathWithLocaleAndSlug when constructing locale-toggle hrefs so
 *    filters survive the navigation.
 *  - Call validateFiltersForContext after data loads to clear params that are
 *    no longer valid for the current slug/page context.
 */

import type { Locale } from "@/lib/content";

/**
 * Extract the specified filter keys from a URLSearchParams or raw query string.
 * Returns an object with exactly the requested keys; missing keys map to "".
 *
 * @example
 * parseFiltersFromSearchParams("year=2026&cat=mens-doubles&group=A", ["year", "cat", "group"])
 * // → { year: "2026", cat: "mens-doubles", group: "A" }
 */
export function parseFiltersFromSearchParams(
  source: URLSearchParams | string,
  keys: readonly string[]
): Record<string, string> {
  const params = typeof source === "string" ? new URLSearchParams(source) : source;
  const result: Record<string, string> = {};
  for (const key of keys) {
    result[key] = params.get(key) ?? "";
  }
  return result;
}

/**
 * Merge `updates` into a copy of `current` params without losing unrelated params.
 * - Empty-string update values delete the key.
 * - Keys listed in `clear` are always removed, regardless of `updates`.
 *
 * Never mutates the input.
 *
 * @example
 * mergeFilterParams("year=2026&cat=mens-singles&group=A", { cat: "mens-doubles" }, ["group"])
 * // → URLSearchParams { year: "2026", cat: "mens-doubles" }
 */
export function mergeFilterParams(
  current: URLSearchParams | string,
  updates: Record<string, string>,
  clear?: readonly string[]
): URLSearchParams {
  const next = new URLSearchParams(
    typeof current === "string" ? current : current.toString()
  );
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  clear?.forEach((k) => next.delete(k));
  return next;
}

/**
 * Build a URL string for a locale toggle, preserving the full pathname (including
 * any slug segments) and appending the current search params so filters survive.
 *
 * /en/draws/mens-doubles?group=A → toggle to ko → /ko/draws/mens-doubles?group=A
 * /ko/draws/mens-doubles?group=A → toggle to en → /draws/mens-doubles?group=A
 *
 * @param pathname    The current Next.js pathname (no query string).
 * @param nextLocale  The target locale.
 * @param searchParams  Current search params to preserve (optional).
 */
export function buildPathWithLocaleAndSlug(
  pathname: string,
  nextLocale: Locale,
  searchParams?: URLSearchParams | string
): string {
  // Strip the /ko prefix to get the locale-neutral path.
  const cleanPath =
    pathname === "/ko" ? "/" :
    pathname.startsWith("/ko/") ? pathname.slice(3) :
    pathname;

  const nextPath =
    nextLocale === "en"
      ? cleanPath
      : cleanPath === "/"
        ? "/ko"
        : `/ko${cleanPath}`;

  if (!searchParams) return nextPath;
  const qs = (typeof searchParams === "string" ? searchParams : searchParams.toString())
    .replace(/^\?/, "");
  return qs ? `${nextPath}?${qs}` : nextPath;
}

/**
 * Apply filter updates to the current browser URL via `history.replaceState`.
 * Does not trigger a Next.js navigation or component re-render.
 *
 * Reads from `window.location.search` rather than a React hook snapshot so
 * the latest params are always used, even when hook state is stale.
 *
 * Client-only — do not call during SSR.
 */
export function updateFiltersInUrl(
  updates: Record<string, string>,
  opts?: { clear?: readonly string[] }
): void {
  const next = mergeFilterParams(window.location.search, updates, opts?.clear);
  const qs = next.toString();
  try {
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  } catch {
    // Browsers throttle history.replaceState (e.g. Chrome/Firefox cap ~100
    // calls per 10s) and throw a SecurityError past that limit — harmless to
    // skip a single URL sync rather than let it crash the page mid-interaction.
  }
}

/**
 * Validate filter values against allowed sets for the current context (slug, page).
 * Returns a copy of `filters` where any value absent from its allowed list is cleared
 * to "". Filters with no entry in `allowed` pass through unchanged.
 *
 * Use this after data loads to drop params that are invalid for the new context
 * without resetting filters that are still valid.
 *
 * @example
 * validateFiltersForContext(
 *   { year: "2026", cat: "invalid-id", group: "A" },
 *   { cat: ["mens-singles", "mens-doubles"], group: ["A", "B"] }
 * )
 * // → { year: "2026", cat: "", group: "A" }
 */
export function validateFiltersForContext(
  filters: Record<string, string>,
  allowed: Record<string, readonly string[]>
): Record<string, string> {
  const result: Record<string, string> = { ...filters };
  for (const [key, allowedValues] of Object.entries(allowed)) {
    if (key in result && result[key] && !allowedValues.includes(result[key]!)) {
      result[key] = "";
    }
  }
  return result;
}
