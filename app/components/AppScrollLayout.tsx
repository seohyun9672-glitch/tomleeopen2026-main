"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/app/components/SiteFooter";

// Strip the /ko locale prefix so we can detect locale-only path changes.
function normalizePath(p: string) {
  return p.replace(/^\/ko(\/|$)/, "/");
}

/**
 * Fills space under the fixed header; only this region scrolls so the header stays full-width.
 * Uses `.scrollbar-none` so the gutter does not shift layout; scrolling is unchanged.
 */
export function AppScrollLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const savedScrollRef = useRef(0);

  // Track scroll position so we can restore it on locale switches.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-app-scroll-root]");
    if (!el) return;
    const onScroll = () => { savedScrollRef.current = el.scrollTop; };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-app-scroll-root]");
    if (!el) return;
    const isLocaleSwitch = normalizePath(prevPathRef.current) === normalizePath(pathname);
    el.scrollTop = isLocaleSwitch ? savedScrollRef.current : 0;
    prevPathRef.current = pathname;
  }, [pathname]);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <div
        data-app-scroll-root
        className="scrollbar-none min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-clip overscroll-y-contain scroll-smooth"
      >
        <div className="flex min-h-full w-full min-w-0 flex-col">
          <main className="flex w-full min-w-0 max-w-none flex-1 flex-col items-stretch justify-start pt-14">{children}</main>
        </div>
        <SiteFooter />
      </div>
    </div>
  );
}
