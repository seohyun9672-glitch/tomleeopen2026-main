"use client";

import { memo } from "react";
import Link from "next/link";
import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";

// ─── Types & guards ───────────────────────────────────────────────────────────

export type HeaderNavLeaf = { readonly href: string; readonly label: string };
export type HeaderNavGroup = {
  readonly label: string;
  readonly children: readonly HeaderNavLeaf[];
};
export type HeaderNavItem = HeaderNavLeaf | HeaderNavGroup;

export function isHeaderNavGroup(item: HeaderNavItem): item is HeaderNavGroup {
  return "children" in item && Array.isArray(item.children);
}
export function isHeaderNavLeaf(item: HeaderNavItem): item is HeaderNavLeaf {
  return !isHeaderNavGroup(item);
}

export function isNavRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ─── NavItem ─────────────────────────────────────────────────────────────────
// Top-level header bar item. Renders as a Link when `href` is provided, otherwise as a button.

const navItemBase =
  "inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header-bg)]";

const navItemActive = "bg-[var(--color-surface-card)]/20 text-[var(--color-text-on-brand)]";
const navItemInactive =
  "text-[var(--color-text-on-brand)]/90 hover:bg-[var(--color-surface-card)]/10 hover:text-[var(--color-text-on-brand)]";

type NavItemBaseProps = {
  label: string;
  isActive: boolean;
  className?: string;
  children?: ReactNode;
};

type NavItemLinkProps = NavItemBaseProps & {
  href: string;
  onClick?: (e: ReactMouseEvent<HTMLAnchorElement>) => void;
};

type NavItemButtonProps = NavItemBaseProps & {
  href?: undefined;
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: true | "true" | "false" | "menu" | "listbox";
  "aria-label"?: string;
};

export type NavItemProps = NavItemLinkProps | NavItemButtonProps;

export const NavItem = memo(function NavItem(props: NavItemProps) {
  const { label, isActive, className, children } = props;
  const cls = cn(navItemBase, isActive ? navItemActive : navItemInactive, className);

  if ("href" in props && props.href) {
    const { href, onClick } = props as NavItemLinkProps;
    return (
      <Link href={href} prefetch={false} onClick={onClick} className={cls}>
        {label}
        {children}
      </Link>
    );
  }

  const {
    onClick,
    buttonRef,
    "aria-expanded": ariaExpanded,
    "aria-haspopup": ariaHasPopup,
    "aria-label": ariaLabel,
  } = props as NavItemButtonProps;

  return (
    <button
      ref={buttonRef}
      type="button"
      onMouseDown={onClick}
      className={cls}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      aria-label={ariaLabel}
    >
      {label}
      {children}
    </button>
  );
});

// ─── SubNavItem ───────────────────────────────────────────────────────────────
// Item inside a NavDropdown or mobile menu group.

const subNavItemBase =
  "flex w-full items-center gap-3 whitespace-nowrap rounded-full px-8 py-2.5 text-left text-sm transition-colors " +
  "hover:bg-[var(--color-surface-card)]/10 hover:text-[var(--color-text-on-brand)]";

export function SubNavItem({
  href,
  onClick,
  isActive,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = cn(
    subNavItemBase,
    isActive
      ? "font-medium text-[var(--color-text-on-brand)]"
      : "text-[var(--color-text-on-brand)]/90",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch={false}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        className={cls}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

// ─── NavDropdown ─────────────────────────────────────────────────────────────
// Floating panel that renders a list of nav items as SubNavItems.
// Each item may have children which are rendered as indented SubNavItems below it.

export type NavDropdownItemDef = {
  key: string;
  label: string;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  children?: Omit<NavDropdownItemDef, "children">[];
};

export function NavDropdown({
  items,
  dropdownRef,
  top,
  left,
  minWidth = 160,
}: {
  items: NavDropdownItemDef[];
  dropdownRef?: RefObject<HTMLDivElement | null>;
  top: number;
  left: number;
  minWidth?: number;
}) {
  return (
    <div
      ref={dropdownRef}
      style={{ top, left, minWidth }}
      className="fixed z-[200] overflow-hidden rounded-xl border border-[color:var(--color-border-on-brand)] bg-[var(--header-bg)] py-1 shadow-lg"
    >
      {items.map((item) => (
        <div key={item.key}>
          <SubNavItem href={item.href} isActive={item.isActive} onClick={item.onClick}>
            {item.label}
          </SubNavItem>
          {item.children?.map((child) => (
            <SubNavItem
              key={child.key}
              href={child.href}
              isActive={child.isActive}
              onClick={child.onClick}
              className="pl-8"
            >
              {child.label}
            </SubNavItem>
          ))}
        </div>
      ))}
    </div>
  );
}
