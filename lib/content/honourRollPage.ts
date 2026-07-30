import { menuLabelForHref } from "./menu";

export const honourRollPage = {
  en: {
      heroTitle: menuLabelForHref("/honour-roll", "en"),
      empty: "No honour roll entries for this category yet.",
      year: "Year",
      champion: "Champion",
      runnerUp: "Runner-up",
      finalists: "Finalists"
  },
  ko: {
      heroTitle: menuLabelForHref("/honour-roll", "ko"),
      empty: "이 카테고리의 기록이 아직 없습니다.",
      year: "연도",
      champion: "우승",
      runnerUp: "준우승",
      finalists: "결승 진출자"
  },
} as const;
