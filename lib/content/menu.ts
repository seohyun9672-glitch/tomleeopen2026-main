export type MenuLocale = "en" | "ko";

export const MENU_ITEMS = [
  { href: "/schedule", label: { en: "Schedule", ko: "일정" } },
  { href: "/draws", label: { en: "Draws", ko: "대진" } },
  { href: "/players", label: { en: "Players", ko: "선수" } },
  { href: "/records", label: { en: "Records", ko: "역대 기록" } },
  {
    label: { en: "Info", ko: "대회 안내" },
    children: [
      { href: "/overview", label: { en: "Overview", ko: "대회 소개" } },
      { href: "/registration", label: { en: "Registration", ko: "참가 신청" } },
      { href: "/rules", label: { en: "Rules", ko: "규칙" } },
      { href: "/honour-roll", label: { en: "Honour Roll", ko: "명예의 전당" } },
    ],
  },
  { href: "/media", label: { en: "Media", ko: "미디어" } },
  { href: "/event", label: { en: "Events", ko: "이벤트" } },
] as const;

const COURT_BOOKING_ITEM = { href: "/court-booking", label: { en: "Book a Court", ko: "코트 예약" } } as const;

/**
 * Single source of truth for a page's display name: every page's own
 * `heroTitle` sources from here instead of duplicating the string, so the
 * nav menu and the page's own title can never drift apart.
 */
export function menuLabelForHref(href: string, locale: MenuLocale): string {
  for (const item of MENU_ITEMS) {
    if ("children" in item) {
      const child = item.children.find((c) => c.href === href);
      if (child) return child.label[locale];
    } else if (item.href === href) {
      return item.label[locale];
    }
  }
  if (COURT_BOOKING_ITEM.href === href) return COURT_BOOKING_ITEM.label[locale];
  throw new Error(`menuLabelForHref: no menu entry for "${href}"`);
}

export function getMenuData(locale: MenuLocale) {
  const p = locale === "ko" ? "/ko" : "";
  const [schedule, draws, players, records, info, media, event] = MENU_ITEMS;
  const [overview, registration, rules, honourRoll] = info.children;

  const loc = (item: { href: string; label: { en: string; ko: string } }) => ({
    href: `${p}${item.href}`,
    label: item.label[locale],
  });

  const nav = MENU_ITEMS.map((item) => {
    if ("children" in item) {
      return {
        label: item.label[locale],
        children: item.children.map(loc),
      };
    }
    return loc(item);
  });

  return {
    nav,
    overview: loc(overview),
    registration: loc(registration),
    rules: loc(rules),
    honourRoll: loc(honourRoll),
    schedule: loc(schedule),
    draws: loc(draws),
    players: loc(players),
    records: loc(records),
    media: loc(media),
    event: loc(event),
    courtBooking: loc(COURT_BOOKING_ITEM),
  };
}
