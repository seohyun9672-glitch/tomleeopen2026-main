"use client";

import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/app/components/SiteFooter";

export function AppScrollLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-app-scroll-root]");
    if (!el) return;

    const savedStr = sessionStorage.getItem("_localeScrollRestore");
    if (savedStr) {
      try {
        const { scrollTop, forPath } = JSON.parse(savedStr) as { scrollTop: number; forPath: string };
        if (forPath === pathname) {
          // Keep the key so StrictMode's second effect run also restores correctly
          el.scrollTo({ top: scrollTop, behavior: "instant" });
          return;
        }
      } catch { /* ignore malformed */ }
    }

    // Different path or no pending restore — clear stale key, then scroll to
    // hash target if present, otherwise reset to top.
    sessionStorage.removeItem("_localeScrollRestore");
    const hash = window.location.hash;
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        const offset = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
        el.scrollTo({ top: offset, behavior: "instant" });
        return;
      }
    }
    el.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  // Intercept hash-only anchor clicks so they scroll the custom container
  // instead of triggering native browser scroll (which targets window).
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest<HTMLAnchorElement>("a[href^='#']");
      if (!anchor) return;
      const hash = anchor.getAttribute("href")!;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      const el = document.querySelector<HTMLElement>("[data-app-scroll-root]");
      if (!el) return;
      const offset = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
      el.scrollTo({ top: offset, behavior: "smooth" });
      window.history.pushState(null, "", hash);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <div
        data-app-scroll-root
        className="scrollbar-none min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-clip overscroll-y-contain scroll-smooth"
      >
        <div className="flex min-h-full w-full min-w-0 flex-col">
          <main className="flex w-full min-w-0 max-w-none flex-1 flex-col items-stretch justify-start pt-14">
            {children}
          </main>
        </div>
        <SiteFooter />
      </div>
    </div>
  );
}