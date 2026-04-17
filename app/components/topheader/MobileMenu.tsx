"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import { HeaderNavLink } from "@/app/components/topheader/NavDropdown";
import {
  type HeaderNavItem,
  isExactNavRouteActive,
  isHeaderNavGroup,
  isTopNavRouteActive,
} from "@/app/components/topheader/headerNavActive";

const headingClass =
  "inline-flex h-10 min-h-10 max-h-10 w-full cursor-default select-none items-center whitespace-nowrap rounded-full px-4 text-sm leading-none font-medium text-[var(--color-text-on-brand)]/90";

type Props = {
  open: boolean;
  onClose: () => void;
  headerBarRef: React.RefObject<HTMLElement | null>;
  navItems: readonly HeaderNavItem[];
  pathname: string;
  siteNavAriaLabel: string;
};

export const MobileMenu = memo(function TopHeaderMobileMenu({
  open,
  onClose,
  headerBarRef,
  navItems,
  pathname,
  siteNavAriaLabel,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);

  const onNavClick = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  const menuBody = useMemo(
    () =>
      navItems.map((item) =>
        isHeaderNavGroup(item) ? (
          <div key={item.label} className="pt-2" role="group" aria-label={item.label}>
            <span className={headingClass} aria-hidden>
              {item.label}
            </span>
            {item.children.map((child) => (
              <HeaderNavLink
                key={child.href}
                href={child.href}
                label={child.label}
                isActive={isExactNavRouteActive(pathname, child.href)}
                onClick={onNavClick}
                className="ml-2 min-w-0"
              />
            ))}
          </div>
        ) : (
          <HeaderNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            isActive={isTopNavRouteActive(pathname, item.href)}
            onClick={onNavClick}
          />
        )
      ),
    [navItems, pathname, onNavClick]
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (headerBarRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, onClose, headerBarRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100] w-full max-w-none self-stretch lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-auto fixed top-14 right-0 bottom-0 left-0 z-[101] w-full max-w-none cursor-default border-0 bg-transparent p-0"
        onClick={onClose}
      />
      <nav
        ref={panelRef}
        className="scrollbar-none pointer-events-auto fixed top-14 right-0 left-0 z-[102] flex w-full max-w-none max-h-[min(100dvh-3.5rem,100vh-3.5rem)] flex-col gap-[var(--element-gap)] overflow-y-auto border-b border-[color:var(--color-border-on-brand)] border-t border-[color:var(--color-border-on-brand)] bg-[var(--header-bg)] px-[var(--page-inline-padding)] py-[var(--content-gap)] shadow-lg"
        aria-label={siteNavAriaLabel}
      >
        {menuBody}
      </nav>
    </div>,
    document.body
  );
});
