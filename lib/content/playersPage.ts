import { menuLabelForHref } from "./menu";

export const playersPage = {
  en: {
    playersPage: {
      heroTitle: menuLabelForHref("/players", "en"),
      emptyStateNoMatch: "No players match your search.",
      emptyStateNoTeams: "No teams found.",
      tabs: {
        players: "Players",
        teams: "Teams",
      },
    },
  },
  ko: {
    playersPage: {
      heroTitle: menuLabelForHref("/players", "ko"),
      emptyStateNoMatch: "검색 결과와 일치하는 선수가 없습니다.",
      emptyStateNoTeams: "팀이 없습니다.",
      tabs: {
        players: "선수",
        teams: "팀",
      },
    },
  },
} as const;
