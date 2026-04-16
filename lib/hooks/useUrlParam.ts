"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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

      // Reflect the change in the URL without triggering a Next.js navigation.
      // Reading window.location.search instead of the hook's searchParams snapshot
      // keeps this setter stable (no searchParams dep → never recreated mid-render).
      const params = new URLSearchParams(window.location.search);
      if (v) params.set(key, v);
      else params.delete(key);
      opts?.clear?.forEach((k) => params.delete(k));
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    },
    [key]
  );

  return [value, set];
}
