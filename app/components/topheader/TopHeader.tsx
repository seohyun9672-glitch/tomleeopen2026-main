"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLocale } from "@/lib/locale-context";
import { Button } from "@/app/components/ui/Button";
import {
  NavItem,
  NavDropdown,
  type HeaderNavItem,
  isHeaderNavGroup,
  isHeaderNavLeaf,
  isNavRouteActive,
} from "@/app/components/topheader/NavDropdown";
import { MobileMenu } from "@/app/components/topheader/MobileMenu";
import { getMenuData } from "@/lib/content/menu";
import { LocaleSelector } from "@/app/components/LocaleSelector";
import { importantDates } from "@/lib/importantDatesData";

export function TopHeader() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLocale();
  const localePrefix = locale === "ko" ? "/ko" : "";
  const handleLocaleChange = useCallback(
    (nextLocale: "en" | "ko") => setLocale(nextLocale),
    [setLocale]
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
    const root = typeof document !== "undefined"
      ? document.querySelector<HTMLElement>("[data-app-scroll-root]")
      : null;
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
    return menu.nav as HeaderNavItem[];
  }, [locale]);

  const isRegistrationOpen = useMemo(() => {
    const reg = importantDates.find((d) => d.type === "range" && d.label === "Registration");
    if (!reg || reg.type !== "range") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= new Date(reg.startDate);
  }, []);

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

  const tournamentActive = useMemo(
    () => !!tournamentGroup?.children.some((child) => isNavRouteActive(pathname, child.href)),
    [tournamentGroup, pathname]
  );

  const toggleTournament = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setTournamentOpen((o) => !o);
    },
    []
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
        items={tournamentGroup.children.map((child) => ({
          key: child.href,
          label: child.label,
          href: child.href,
          isActive: isNavRouteActive(pathname, child.href),
          onClick: closeTournament,
        }))}
        top={dropdownPosition.top}
        left={dropdownPosition.left}
        dropdownRef={dropdownRef}
        minWidth={180}
      />,
      document.body
    );

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-[110] w-full shrink-0 border-b border-[color:var(--color-border-on-brand)] bg-[var(--header-bg)]">
        <div className="w-full overflow-x-clip">
          <div
            ref={headerBarRef}
            className="relative z-[111] mx-auto flex h-14 w-full max-w-[var(--container-max-w)] items-center justify-between gap-[var(--element-gap)] bg-[var(--header-bg)] px-[var(--page-inline-padding)] sm:gap-[var(--content-gap)]"
          >
            <div className="flex min-w-0 flex-1 items-center gap-1 lg:gap-1.5">
              <Link
                href={localePrefix || "/"}
                className="site-logo site-logo--footer"
                aria-label="Tomlee Open — Home"
              >
                <img src="/logo.svg" alt="Tomlee Open" className="site-logo__img" />
              </Link>
              <LocaleSelector
                locale={locale}
                onChange={handleLocaleChange}
                enLabel={t.header.language.en}
                koLabel={t.header.language.ko}
              />
            </div>

            {/* Mobile: register button + hamburger */}
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              {isRegistrationOpen && (
                <Button href={`${localePrefix}/registration`} variant="primary" size="medium">
                  {t.header.register}
                </Button>
              )}
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-on-brand)] transition-colors hover:bg-[var(--color-surface-card)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header-bg)]"
                aria-label={menuOpen ? t.header.closeMenu : t.header.openMenu}
                aria-expanded={menuOpen}
              >
                {menuOpen ? (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* Desktop nav */}
            <nav className="hidden shrink-0 items-center gap-[var(--element-gap)] lg:flex">
              {tournamentGroup && (
                <div className="relative shrink-0" ref={tournamentRef}>
                  <NavItem
                    label={tournamentGroup.label}
                    isActive={tournamentActive}
                    buttonRef={tournamentButtonRef}
                    onClick={toggleTournament}
                    aria-expanded={tournamentOpen}
                    aria-haspopup="menu"
                    aria-label={t.header.tournamentMenu}
                  >
                    <span className="ml-1 text-[0.9em] opacity-80" aria-hidden>▾</span>
                  </NavItem>
                </div>
              )}
              {leafItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  isActive={isNavRouteActive(pathname, item.href)}
                  className="shrink-0"
                />
              ))}
              {isRegistrationOpen && (
                <Button
                  href={`${localePrefix}/registration`}
                  variant="primary"
                  size="medium"
                  className="shrink-0"
                >
                  {t.header.register}
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <MobileMenu
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
