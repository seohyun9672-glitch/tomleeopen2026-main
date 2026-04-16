"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { updateFiltersInUrl } from "@/lib/filterState";

/**
 * Read and write a single URL search param.
 *
 * Value updates are applied to local state immediately (no navigation lag), while the URL
 * is updated via `history.replaceState` — no Next.js navigation is triggered, so the
 * component tree doesn't re-render from a route change. `useSearchParams` is only read to
 * sync back when the URL changes externally (browser back/forward, link clicks).
 *
 * Because the setter never closes over the live `searchParams` object it is referentially
 * stable across renders, which prevents the feedback loop that `router.replace` causes:
 *   router.replace → new searchParams → new setter → effect re-fires → loop.
 *
 * @param key - The search param key.
 * @returns [value, set] — current string value (empty string if absent) and a stable setter.
 *
 * The setter accepts an optional `clear` list of other param keys to remove at the same
 * time, useful when changing one filter should reset dependent filters.
 */
export function useUrlParam(
  key: string
): [value: string, set: (value: string, opts?: { clear?: string[] }) => void] {
  const searchParams = useSearchParams();

  // Local state drives rendering — updates are instant, no router round-trip.
  const [value, setValue] = useState(() => searchParams.get(key) ?? "");

  // Sync when the URL changes externally (browser back/forward, router.push elsewhere).
  useEffect(() => {
    setValue(searchParams.get(key) ?? "");
  }, [searchParams, key]);

  const set = useCallback(
    (v: string, opts?: { clear?: string[] }) => {
      // Update local state immediately for instant UI feedback.
      setValue(v);
      // Delegate URL mutation to the shared utility so all param writes go
      // through one place (merges rather than replaces the whole query string).
      updateFiltersInUrl({ [key]: v }, { clear: opts?.clear });
    },
    [key]
  );

  return [value, set];
}
