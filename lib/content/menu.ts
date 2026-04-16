export type MenuLocale = "en" | "ko";

const MENU_ITEMS = {
  tournament: {
    label: { en: "Tournament", ko: "대회" },
    children: [
      { href: "/overview", label: { en: "Overview", ko: "개요" } },
      { href: "/rules", label: { en: "Rules", ko: "규칙" } },
      { href: "/honour-roll", label: { en: "Honour roll", ko: "명예의 전당" } },
    ],
  },
  primary: [
    { href: "/schedule", label: { en: "Schedule", ko: "일정" } },
    { href: "/draws", label: { en: "Draws", ko: "대진" } },
    { href: "/players", label: { en: "Players", ko: "선수" } },
    { href: "/media", label: { en: "Media", ko: "미디어" } },
  ],
  homeHero: [
    { href: "/overview", label: { en: "Overview", ko: "개요" } },
    { href: "/schedule", label: { en: "Schedules", ko: "일정" } },
    { href: "/draws", label: { en: "Draws", ko: "대진" } },
  ],
} as const;

export function getMenuData(locale: MenuLocale) {
  const p = locale === "ko" ? "/ko" : "";
  return {
    tournament: {
      label: MENU_ITEMS.tournament.label[locale],
      children: MENU_ITEMS.tournament.children.map((item) => ({
        href: `${p}${item.href}`,
        label: item.label[locale],
      })),
    },
    primary: MENU_ITEMS.primary.map((item) => ({
      href: `${p}${item.href}`,
      label: item.label[locale],
    })),
    homeHero: MENU_ITEMS.homeHero.map((item) => ({
      href: `${p}${item.href}`,
      label: item.label[locale],
    })),
  };
}

export function getMenuLabelByHref(locale: MenuLocale, href: string): string | null {
  // Accept both plain paths (/draws) and locale-prefixed paths (/ko/draws)
  const p = locale === "ko" ? "/ko" : "";
  const normHref = href.startsWith(p) ? href : `${p}${href}`;
  const menu = getMenuData(locale);
  for (const item of menu.tournament.children) {
    if (item.href === normHref) return item.label;
  }
  for (const item of menu.primary) {
    if (item.href === normHref) return item.label;
  }
  return null;
}
