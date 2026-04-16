/** Top-level nav item: exact match or nested segment (e.g. /schedule/…). */
export function isTopNavRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Tournament dropdown child routes (flat paths like /overview). */
export function isExactNavRouteActive(pathname: string, href: string): boolean {
  return pathname === href;
}

/** Desktop “Tournament” trigger — matches legacy behaviour. */
export function isTournamentNavTriggerActive(pathname: string): boolean {
  return pathname.startsWith("/tournament");
}

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
