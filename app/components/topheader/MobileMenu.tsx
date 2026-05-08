"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { MouseEvent as ReactMouseEvent } from "react";

import {
  NavItem,
  SubNavItem,
  type HeaderNavItem,
  isHeaderNavGroup,
  isNavRouteActive,
} from "@/app/components/topheader/NavDropdown";

const groupHeadingCls =
  "inline-flex h-10 w-full cursor-default select-none items-center whitespace-nowrap rounded-full px-4 text-sm font-medium text-[var(--color-text-on-brand)]/90";

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
            <span className={groupHeadingCls} aria-hidden>
              {item.label}
            </span>
            {item.children.map((child) => (
              <SubNavItem
                key={child.href}
                href={child.href}
                isActive={isNavRouteActive(pathname, child.href)}
                onClick={onClose}
              >
                {child.label}
              </SubNavItem>
            ))}
          </div>
        ) : (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            isActive={isNavRouteActive(pathname, item.href)}
            onClick={onNavClick}
            className="w-full"
          />
        )
      ),
    [navItems, pathname, onNavClick, onClose]
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
    <div className="pointer-events-none fixed inset-0 z-[100] w-full lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-auto fixed top-14 right-0 bottom-0 left-0 z-[101] cursor-default border-0 bg-transparent p-0"
        onClick={onClose}
      />
      <nav
        ref={panelRef}
        className="scrollbar-none pointer-events-auto fixed top-14 right-0 left-0 z-[102] flex w-full max-h-[min(100dvh-3.5rem,100vh-3.5rem)] flex-col gap-[var(--element-gap)] overflow-y-auto border-b border-t border-[color:var(--color-border-on-brand)] bg-[var(--header-bg)] px-[var(--page-inline-padding)] py-[var(--content-gap)] shadow-lg"
        aria-label={siteNavAriaLabel}
      >
        {menuBody}
      </nav>
    </div>,
    document.body
  );
});
