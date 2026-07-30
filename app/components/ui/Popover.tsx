"use client";

import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type PopoverPlacement = "above" | "below";

type AnchorRect = { top: number; bottom: number; left: number; right: number; width: number };

export type PopoverPosition = {
  placement: PopoverPlacement;
  maxHeight: number;
  /** Trigger's viewport-relative rect, used to position the portaled popover. */
  anchorRect: AnchorRect | null;
};

export function usePopoverPlacement(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  listMaxHeightPx: number,
): PopoverPosition {
  const [position, setPosition] = useState<PopoverPosition>({
    placement: "below",
    maxHeight: listMaxHeightPx,
    anchorRect: null,
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
      setPosition({
        placement,
        maxHeight,
        anchorRect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width },
      });
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
  /**
   * One ref, or a list of refs, whose subtree counts as "inside" — pass both
   * the trigger's container ref and the `Popover`'s own ref, since the
   * popover content is portaled to `document.body` and is no longer a DOM
   * descendant of the trigger container.
   */
  containerRef: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  onDismiss: () => void
) {
  useLayoutEffect(() => {
    if (!open) return;
    const refs = Array.isArray(containerRef) ? containerRef : [containerRef];
    function onDocPointerDown(e: PointerEvent) {
      if (refs.some((r) => r.current?.contains(e.target as Node))) return;
      onDismiss();
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open, containerRef, onDismiss]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Closes the popover when the page (or any ancestor container) scrolls,
 * instead of leaving it open and trying to track the trigger — a
 * position: fixed popover drifting away from its trigger while the page
 * scrolls underneath it reads as broken, so it's simpler to just dismiss it.
 * Scrolling *inside* the popover's own option list (or the trigger) doesn't
 * count — pass the same refs as `useDismissOnOutsidePointerDown`.
 */
export function useCloseOnScroll(
  open: boolean,
  containerRef: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  onClose: () => void
) {
  useLayoutEffect(() => {
    if (!open) return;
    const refs = Array.isArray(containerRef) ? containerRef : [containerRef];
    function onScroll(e: Event) {
      if (refs.some((r) => r.current?.contains(e.target as Node))) return;
      onClose();
    }
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [open, containerRef, onClose]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Portaled to `document.body` and positioned with `position: fixed` from the
 * trigger's measured viewport rect (`anchorRect`), instead of relying on CSS
 * `position: absolute` relative to whatever DOM ancestor happens to hold the
 * trigger. A `position: absolute` popover only wins z-index battles within
 * its own stacking context — if an ancestor is itself positioned with a
 * z-index (e.g. a sticky header), the popover can end up trapped behind
 * unrelated elements elsewhere in the tree (like a sticky table header).
 * Portaling to `document.body` has no such ancestor, so "always on top" is
 * structurally guaranteed rather than a z-index arms race.
 */
export const Popover = forwardRef<HTMLDivElement, {
  placement: PopoverPlacement;
  /**
   * Content-sized popover (`w-max`, hugs its own content instead of matching
   * the trigger's width) — centered under the trigger and clamped to the
   * viewport based on its actual rendered width, instead of the default
   * full-width span matching the trigger.
   */
  center?: boolean;
  maxHeightPx: number;
  anchorRect: AnchorRect | null;
  className?: string;
  children: ReactNode;
}>(function Popover({ placement, center, maxHeightPx, anchorRect, className = "", children }, ref) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  // Measured on mount (its width depends on its own content, so it can't be
  // known up front) and re-measured on window resize — but deliberately NOT
  // on every `anchorRect` update, since that also fires on scroll and would
  // mean re-measuring (and briefly mispositioning) on every scroll tick.
  // `useLayoutEffect` fires before the browser paints, so the initial
  // measurement causes no visible flash; the `left` position itself is
  // still computed fresh from the live `anchorRect` on every render below,
  // so scrolling/resizing both slide the popover along with the trigger —
  // resize additionally gets an up-to-date width in case the trigger (and
  // therefore this box's `minWidth`) changed size too.
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!center) return;
    const el = innerRef.current;
    if (!el) return;
    const measureWidth = () => setMeasuredWidth(el.getBoundingClientRect().width);
    measureWidth();
    window.addEventListener("resize", measureWidth);
    return () => window.removeEventListener("resize", measureWidth);
  }, [center]);

  if (!anchorRect || typeof document === "undefined") return null;

  const style: CSSProperties = {
    position: "fixed",
    maxHeight: maxHeightPx,
    // Higher than every other fixed/portaled layer in the app (header nav
    // dropdown, mobile menu, modals, the date picker's own z-[9999]) so this
    // popover is never trapped behind something else on screen.
    zIndex: 10000,
  };
  if (placement === "below") {
    style.top = anchorRect.bottom + 4;
  } else {
    style.bottom = window.innerHeight - anchorRect.top + 4;
  }
  if (center) {
    // Hugs its own content up to `className`'s max-width, but never
    // shrinks narrower than the filter it's spanning.
    style.minWidth = anchorRect.width;
    const margin = 8;
    const width = measuredWidth ?? anchorRect.width;
    const centered = anchorRect.left + anchorRect.width / 2 - width / 2;
    style.left = Math.min(Math.max(centered, margin), window.innerWidth - width - margin);
  } else {
    style.left = anchorRect.left;
    style.width = anchorRect.width;
  }

  return createPortal(
    <div
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      style={style}
      className={`scrollbar-visible overflow-y-auto rounded-lg border py-1 shadow-lg [border-color:var(--input-border)] [background-color:var(--input-bg)] ${
        center ? "w-max" : ""
      } ${className}`.trim()}
    >
      {children}
    </div>,
    document.body,
  );
});
