"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Fades the content up into view when it enters the viewport.
 * Renders normally on the server (no opacity-0 flash before hydration).
 * Respects prefers-reduced-motion via CSS.
 */
export function FadeIn({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"idle" | "hidden" | "visible">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("visible");
          observer.disconnect();
        } else {
          setPhase("hidden");
        }
      },
      { threshold: 0.08 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cls =
    phase === "hidden"
      ? "section-will-animate"
      : phase === "visible"
        ? "section-animate-in"
        : "";

  return (
    <div ref={ref} className={`${cls} ${className}`.trim()}>
      {children}
    </div>
  );
}
