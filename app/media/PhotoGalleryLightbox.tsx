"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/app/components/ui/Button";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1={18} y1={6} x2={6} y2={18} />
      <line x1={6} y1={6} x2={18} y2={18} />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

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
      {/* Counter — pinned top-left, non-interactive */}
      <p className="pointer-events-none absolute left-4 top-4 z-10 m-0 text-sm tabular-nums text-white opacity-90">
        {index + 1} / {urls.length}
      </p>

      {/* Close button — pinned top-right, always visible */}
      <IconButton
        aria-label={closeLabel}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 z-10 text-white hover:bg-white/15 focus-visible:ring-offset-transparent"
      >
        <XIcon />
      </IconButton>

      <div
        className="relative flex max-h-[100dvh] w-full max-w-6xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
          {showNav && (
            <IconButton
              aria-label={prevLabel}
              onClick={goPrev}
              className="absolute left-0 z-10 text-white hover:bg-white/15 focus-visible:ring-offset-transparent"
            >
              <ChevronLeftIcon />
            </IconButton>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-[min(85dvh,900px)] max-w-full object-contain"
          />
          {showNav && (
            <IconButton
              aria-label={nextLabel}
              onClick={goNext}
              className="absolute right-0 z-10 text-white hover:bg-white/15 focus-visible:ring-offset-transparent"
            >
              <ChevronRightIcon />
            </IconButton>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
