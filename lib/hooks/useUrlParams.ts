"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { updateFiltersInUrl } from "@/lib/filterState";

type SetParam = (key: string, value: string, opts?: { clear?: string[] }) => void;

/**
 * Read and write multiple URL search params at once.
 *
 * Same contract as useUrlParam but for a set of keys. Local state updates
 * are instant; the URL is patched via history.replaceState without triggering
 * a Next.js navigation. External URL changes (browser back/forward) are
 * synced back via useSearchParams.
 */
export function useUrlParams(
  keys: readonly string[],
): [values: Record<string, string>, set: SetParam] {
  const searchParams = useSearchParams();
  const keysRef = useRef(keys);
  keysRef.current = keys;

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, searchParams.get(k) ?? ""])),
  );

  useEffect(() => {
    setValues((prev) => {
      const next = Object.fromEntries(
        keysRef.current.map((k) => [k, searchParams.get(k) ?? ""]),
      );
      return keysRef.current.some((k) => prev[k] !== next[k]) ? next : prev;
    });
  }, [searchParams]);

  const set = useCallback<SetParam>((key, value, opts) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      for (const k of opts?.clear ?? []) next[k] = "";
      return next;
    });
    updateFiltersInUrl({ [key]: value }, { clear: opts?.clear });
  }, []);

  return [values, set];
}
