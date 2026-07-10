"use client";

import {
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export type PopoverPlacement = "above" | "below";

export type PopoverPosition = { placement: PopoverPlacement; maxHeight: number };

export function usePopoverPlacement(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  listMaxHeightPx: number
): PopoverPosition {
  const [position, setPosition] = useState<PopoverPosition>({
    placement: "below",
    maxHeight: listMaxHeightPx,
  });

  useLayoutEffect(() => {
    if (!open) return;

    function measure() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 8;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      let placement: PopoverPlacement;
      if (spaceBelow >= listMaxHeightPx) {
        placement = "below";
      } else if (spaceAbove >= listMaxHeightPx) {
        placement = "above";
      } else {
        placement = spaceAbove > spaceBelow ? "above" : "below";
      }
      const maxHeight = Math.min(
        listMaxHeightPx,
        placement === "below" ? spaceBelow : spaceAbove
      );
      setPosition({ placement, maxHeight });
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

  return position;
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
  maxHeightPx,
  className = "",
  children,
}: {
  placement: PopoverPlacement;
  maxHeightPx: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ maxHeight: maxHeightPx }}
      className={`absolute left-0 right-0 z-[200] w-full overflow-y-auto rounded-lg border py-1 shadow-lg [border-color:var(--input-border)] [background-color:var(--input-bg)] ${
        placement === "below" ? "top-full mt-1" : "bottom-full mb-1"
      } ${className}`.trim()}
    >
      {children}
    </div>
  );
}
