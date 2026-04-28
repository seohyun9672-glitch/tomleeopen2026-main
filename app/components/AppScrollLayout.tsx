"use client";

import { useLayoutEffect, type ReactNode } from "react";
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

    // Different path or no pending restore — clear stale key and reset to top
    sessionStorage.removeItem("_localeScrollRestore");
    el.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

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