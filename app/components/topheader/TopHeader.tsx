"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLocale } from "@/lib/locale-context";
import { getAppScrollRootEl } from "@/lib/appScrollRoot";
import { Button } from "@/app/components/ui/Button";
import {
  type HeaderNavItem,
  isHeaderNavGroup,
  isHeaderNavLeaf,
  isTopNavRouteActive,
  isTournamentNavTriggerActive,
} from "@/app/components/topheader/headerNavActive";
import { HeaderNavLink, NavDropdown, NavDropdownItem } from "@/app/components/topheader/NavDropdown";
import { TopHeaderMobileMenu } from "@/app/components/topheader/TopHeaderMobileMenu";
import { getMenuData } from "@/lib/content/menu";
import { LocaleSelector } from "@/app/components/LocaleSelector";

const tournamentButtonBase =
  "flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header-bg)]";

const tournamentButtonActive =
  "bg-[var(--color-surface-card)]/20 text-[var(--color-text-on-brand)]";
const tournamentButtonInactive =
  "text-[var(--color-text-on-brand)]/90 hover:bg-[var(--color-surface-card)]/10 hover:text-[var(--color-text-on-brand)]";


export function TopHeader() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLocale();
  const localePrefix = locale === "ko" ? "/ko" : "";
  const handleLocaleChange = useCallback(
    (nextLocale: "en" | "ko") => setLocale(nextLocale),
    [setLocale],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const headerBarRef = useRef<HTMLDivElement>(null);
  const tournamentRef = useRef<HTMLDivElement>(null);
  const tournamentButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const root = getAppScrollRootEl();
    if (root) {
      const prevOverflow = root.style.overflow;
      const prevPad = root.style.paddingRight;
      const scrollbarW = root.offsetWidth - root.clientWidth;
      root.style.overflow = "hidden";
      if (scrollbarW > 0) root.style.paddingRight = `${scrollbarW}px`;
      return () => {
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
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    function closeMobileMenuAtLg() {
      if (mq.matches) setMenuOpen(false);
    }
    mq.addEventListener("change", closeMobileMenuAtLg);
    return () => mq.removeEventListener("change", closeMobileMenuAtLg);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeTournament = useCallback(() => setTournamentOpen(false), []);

  const navItems = useMemo<HeaderNavItem[]>(() => {
    const menu = getMenuData(locale);
    return [
      {
        label: menu.tournament.label,
        children: menu.tournament.children,
      },
      ...menu.primary,
    ];
  }, [locale]);

  const { tournamentGroup, leafItems } = useMemo(() => {
    const first = navItems[0];
    if (first && isHeaderNavGroup(first)) {
      return {
        tournamentGroup: first,
        leafItems: navItems.slice(1).filter(isHeaderNavLeaf),
      };
    }
    return {
      tournamentGroup: null as null,
      leafItems: navItems.filter(isHeaderNavLeaf),
    };
  }, [navItems]);

  const tournamentTriggerActive = isTournamentNavTriggerActive(pathname);

  const toggleTournament = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setTournamentOpen((o) => !o);
    },
    [],
  );

  useEffect(() => {
    if (!tournamentOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (tournamentRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setTournamentOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [tournamentOpen]);

  useEffect(() => {
    if (!tournamentOpen || !tournamentButtonRef.current) return;
    const rect = tournamentButtonRef.current.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 4, left: rect.left });
  }, [tournamentOpen]);

  const dropdownPortal =
    tournamentOpen &&
    tournamentGroup &&
    typeof document !== "undefined" &&
    createPortal(
      <NavDropdown
        top={dropdownPosition.top}
        left={dropdownPosition.left}
        dropdownRef={dropdownRef}
        minWidth={180}
      >
        {tournamentGroup.children.map((child) => (
          <NavDropdownItem key={child.href} href={child.href} onClick={closeTournament}>
            {child.label}
          </NavDropdownItem>
        ))}
      </NavDropdown>,
      document.body,
    );

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-[110] w-full max-w-none min-w-0 shrink-0 border-b border-[color:var(--color-border-on-brand)] bg-[var(--header-bg)]">
        <div className="w-full min-w-0 overflow-x-clip">
          <div
            ref={headerBarRef}
            className="relative z-[111] mx-auto flex h-14 w-full min-w-0 max-w-[var(--container-max-w)] items-center justify-between gap-[var(--element-gap)] bg-[var(--header-bg)] px-[var(--page-inline-padding)] sm:gap-[var(--content-gap)]"
          >
            <div className="flex min-w-0 flex-1 items-center gap-1 md:gap-1 lg:gap-1.5">
              <Link
                href={localePrefix || "/"}
                className="site-logo site-logo--footer"
                aria-label="Tomlee Open — Home"
              >
                <img
                  src="/logo.svg"
                  alt="Tomlee Open"
                  className="site-logo__img"
                />
              </Link>
              <LocaleSelector
                locale={locale}
                onChange={handleLocaleChange}
                enLabel={t.header.language.en}
                koLabel={t.header.language.ko}
              />
            </div>

            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <Button
                href={`${localePrefix}/registration`}
                variant="primary"
                size="medium"
                className="w-afiuto"
              >
                {t.header.register}
              </Button>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex h-8 max-h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-on-brand)] transition-colors hover:bg-[var(--color-surface-card)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header-bg)]"
                aria-label={menuOpen ? t.header.closeMenu : t.header.openMenu}
                aria-expanded={menuOpen}
              >
                {menuOpen ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>

            <nav className="hidden shrink-0 items-center gap-[var(--element-gap)] lg:flex">
              {tournamentGroup ? (
                <div className="relative shrink-0" ref={tournamentRef}>
                  <button
                    ref={tournamentButtonRef}
                    type="button"
                    onMouseDown={toggleTournament}
                    className={`${tournamentButtonBase} ${
                      tournamentTriggerActive
                        ? tournamentButtonActive
                        : tournamentButtonInactive
                    }`}
                    aria-expanded={tournamentOpen}
                    aria-haspopup="true"
                    aria-label={t.header.tournamentMenu}
                  >
                    {tournamentGroup.label}
                    <span className="text-[0.9em] opacity-80" aria-hidden>
                      ▾
                    </span>
                  </button>
                </div>
              ) : null}
              {leafItems.map((item) => (
                <HeaderNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  isActive={isTopNavRouteActive(pathname, item.href)}
                  className="shrink-0 lg:w-auto"
                />
              ))}
              <Button
                href={`${localePrefix}/registration`}
                variant="primary"
                size="medium"
                className="shrink-0"
              >
                {t.header.register}
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <TopHeaderMobileMenu
        open={menuOpen}
        onClose={closeMenu}
        headerBarRef={headerBarRef}
        navItems={navItems}
        pathname={pathname}
        siteNavAriaLabel={t.header.siteName}
      />

      {dropdownPortal}
    </>
  );
}
