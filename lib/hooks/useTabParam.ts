"use client";
import { useCallback } from "react";
import { useUrlParam } from "./useUrlParam";

/**
 * Manages a `?tab=<value>` URL param for a tab list.
 *
 * Validates the param against `tabs[*].value`; falls back to `tabs[0].value`
 * when absent or unrecognised. Values are used as URL slugs (e.g. `?tab=players`),
 * while display labels are kept separate in each tab definition.
 *
 * @param tabs - Tab definitions; `value` becomes the URL slug.
 * @param clearOnChange - Param keys to clear when the tab changes (e.g. filter resets).
 */
export function useTabParam<T extends string>(
  tabs: readonly { value: T }[],
  clearOnChange?: string[]
): [T, (value: T) => void] {
  const [param, setParam] = useUrlParam("tab");
  const value = tabs.some((t) => t.value === param) ? (param as T) : tabs[0].value;
  const set = useCallback(
    (v: T) => setParam(v, clearOnChange?.length ? { clear: clearOnChange } : undefined),
    [setParam] // clearOnChange is a constant literal at every call site
  );
  return [value, set];
}
