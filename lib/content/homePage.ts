import { getMenuData } from "@/lib/content/menu";

export const homePage = {
  en: {
    homePage: {
      heroTitle: "Tomlee Open",
      hero: {
        title: "Tomlee Open",
        navLinks: [getMenuData("en").overview, getMenuData("en").schedule, getMenuData("en").draws],
      },
      sectionTitles: {
        tournamentSchedules: "Tournament schedules",
        todaysMatches: "Today's matches",
        sponsors: "Sponsors",
        communityPartners: "Community partners",
        clubs: "Clubs",
        lessons: "Lessons",
      },
      buttons: {
        viewAll: "View all",
      },
      todayMatchesEmpty: {
        beforeLink: "No matches scheduled for today. Check the",
        scheduleLink: "Schedule",
        afterLink: " for upcoming matches.",
      },
      matchListCourtPrefix: "Court",
      matchListVersus: "vs",
      calendar: {
        weekdayShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const,
      },
      sponsorTierLabels: {
        gold: "Gold Sponsor",
        silver: "Silver Sponsors",
        bronze: "Bronze Sponsors",
      },
      sectionNotes: {
        sponsors: undefined as string | undefined,
        communityPartners: undefined as string | undefined,
        clubs: undefined as string | undefined,
      },
    },
  },
  ko: {
    homePage: {
      heroTitle: "탐리 오픈",
      hero: {
        title: "탐리 오픈",
        navLinks: [getMenuData("ko").overview, getMenuData("ko").schedule, getMenuData("ko").draws],
      },
      sectionTitles: {
        tournamentSchedules: "대회 일정",
        todaysMatches: "오늘의 경기",
        sponsors: "스폰서",
        communityPartners: "커뮤니티 파트너",
        clubs: "클럽",
        lessons: "레슨",
      },
      buttons: {
        viewAll: "전체 보기",
      },
      todayMatchesEmpty: {
        beforeLink: "오늘 예정된 경기가 없습니다.",
        scheduleLink: "일정",
        afterLink: "에서 예정 경기를 확인하세요.",
      },
      matchListCourtPrefix: "코트",
      matchListVersus: "vs",
      calendar: {
        weekdayShort: ["일", "월", "화", "수", "목", "금", "토"] as const,
      },
      sponsorTierLabels: {
        gold: "골드 스폰서",
        silver: "실버 스폰서",
        bronze: "브론즈 스폰서",
      },
      sectionNotes: {
        sponsors: undefined as string | undefined,
        communityPartners: undefined as string | undefined,
        clubs: undefined as string | undefined,
      },
    },
  },
} as const;
