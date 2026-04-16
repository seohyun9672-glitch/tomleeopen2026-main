"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/app/components/SiteFooter";

/**
 * Fills space under the fixed header; only this region scrolls so the header stays full-width.
 * Uses `.scrollbar-none` so the gutter does not shift layout; scrolling is unchanged.
 */
export function AppScrollLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const el = document.querySelector("[data-app-scroll-root]");
    if (el) el.scrollTop = 0;
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
