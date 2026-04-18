export type MenuLocale = "en" | "ko";

export const MENU_ITEMS = [
  {
    label: { en: "Tournament", ko: "대회" },
    children: [
      { href: "/overview", label: { en: "Overview", ko: "개요" } },
      { href: "/rules", label: { en: "Rules", ko: "규칙" } },
      { href: "/honour-roll", label: { en: "Honour roll", ko: "명예의 전당" } },
    ],
  },
  { href: "/schedule", label: { en: "Schedule", ko: "일정" } },
  { href: "/draws", label: { en: "Draws", ko: "대진" } },
  { href: "/players", label: { en: "Players", ko: "선수" } },
  { href: "/media", label: { en: "Media", ko: "미디어" } },
] as const;

export function getMenuData(locale: MenuLocale) {
  const p = locale === "ko" ? "/ko" : "";
  const [tournament, schedule, draws, players, media] = MENU_ITEMS;
  const [overview, rules, honourRoll] = tournament.children;

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
    rules: loc(rules),
    honourRoll: loc(honourRoll),
    schedule: loc(schedule),
    draws: loc(draws),
    players: loc(players),
    media: loc(media),
  };
}
