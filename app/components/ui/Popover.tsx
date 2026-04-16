"use client";

import {
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export type PopoverPlacement = "above" | "below";

export function usePopoverPlacement(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  listMaxHeightPx: number
): PopoverPlacement {
  const [placement, setPlacement] = useState<PopoverPlacement>("below");

  useLayoutEffect(() => {
    if (!open) return;

    function measure() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 8;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      if (spaceBelow >= listMaxHeightPx) {
        setPlacement("below");
      } else if (spaceAbove >= listMaxHeightPx) {
        setPlacement("above");
      } else {
        setPlacement(spaceAbove > spaceBelow ? "above" : "below");
      }
    }

    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, triggerRef, listMaxHeightPx]);

  return placement;
}

export function useDismissOnOutsidePointerDown(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void
) {
  useLayoutEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      onDismiss();
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open, containerRef, onDismiss]);
}

export function Popover({
  placement,
  maxHeightClass = "max-h-56",
  className = "",
  children,
}: {
  placement: PopoverPlacement;
  maxHeightClass?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute left-0 right-0 z-20 w-full overflow-auto rounded-lg border py-1 shadow-lg [border-color:var(--input-border)] [background-color:var(--input-bg)] ${maxHeightClass} ${
        placement === "below" ? "top-full mt-1" : "bottom-full mb-1"
      } ${className}`.trim()}
    >
      {children}
    </div>
  );
}
