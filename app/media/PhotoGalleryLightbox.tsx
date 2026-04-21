"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  urls: string[];
  initialIndex?: number;
  onClose: () => void;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
};

export function PhotoGalleryLightbox({
  urls,
  initialIndex = 0,
  onClose,
  closeLabel,
  prevLabel,
  nextLabel,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, urls.length, urls[0]]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % urls.length);
  }, [urls.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    const root = typeof document !== "undefined" ? document.querySelector<HTMLElement>("[data-app-scroll-root]") : null;
    if (root) {
      const prevOverflow = root.style.overflow;
      const prevPad = root.style.paddingRight;
      const scrollbarW = root.offsetWidth - root.clientWidth;
      root.style.overflow = "hidden";
      if (scrollbarW > 0) root.style.paddingRight = `${scrollbarW}px`;
      return () => {
        window.removeEventListener("keydown", onKey);
        root.style.overflow = prevOverflow;
        root.style.paddingRight = prevPad;
      };
    }
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const scrollbarW = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [onClose, goPrev, goNext]);

  if (!mounted || urls.length === 0) return null;

  const src = urls[index];
  const showNav = urls.length > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--overlay-scrim-strong)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[100dvh] w-full max-w-6xl flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between gap-2 text-[var(--color-text-on-brand)]">
          <p className="m-0 text-sm tabular-nums opacity-90">
            {index + 1} / {urls.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[color:var(--color-border-on-brand)] bg-[var(--overlay-control-bg)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-on-brand)] hover:bg-[var(--overlay-control-bg-hover)]"
          >
            {closeLabel}
          </button>
        </div>
        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
          {showNav ? (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-0 z-10 rounded-r-lg border border-[color:var(--color-border-on-brand)] bg-[var(--overlay-control-bg)] px-2 py-6 text-[var(--color-text-on-brand)] hover:bg-[var(--overlay-control-bg-hover)] sm:px-3"
              aria-label={prevLabel}
            >
              ‹
            </button>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-[min(85dvh,900px)] max-w-full object-contain"
          />
          {showNav ? (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-0 z-10 rounded-l-lg border border-[color:var(--color-border-on-brand)] bg-[var(--overlay-control-bg)] px-2 py-6 text-[var(--color-text-on-brand)] hover:bg-[var(--overlay-control-bg-hover)] sm:px-3"
              aria-label={nextLabel}
            >
              ›
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
