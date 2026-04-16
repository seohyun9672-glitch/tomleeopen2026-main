import { getMenuData } from "@/lib/content/menu";
import { importantDates } from "@/lib/importantDatesData";

const tournamentEntry = importantDates.find((e) => e.label === "Tournament");
const heroDateRangeEn = tournamentEntry && tournamentEntry.type !== "text" ? tournamentEntry.valueDisplay : "June 1 – August 26, 2026";
const heroDateRangeKo = tournamentEntry && tournamentEntry.type !== "text" ? (tournamentEntry.valueDisplayKo ?? tournamentEntry.valueDisplay) : "2026년 6월 1일 – 8월 26일";

export const homePage = {
  en: {
    homePage: {
      heroTitle: "Tomlee Open",
      heroDateRange: heroDateRangeEn,
      hero: {
        title: "Tomlee Open",
        dateRange: heroDateRangeEn,
        navLinks: getMenuData("en").homeHero,
      },
      sectionTitles: {
        tournamentSchedules: "Tournament schedules",
        todaysMatches: "Today's matches",
        sponsors: "Sponsors",
        communityPartners: "Community partners",
        clubs: "Clubs",
        lessons: "Lessons",
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
      heroDateRange: heroDateRangeKo,
      hero: {
        title: "탐리 오픈",
        dateRange: heroDateRangeKo,
        navLinks: getMenuData("ko").homeHero,
      },
      sectionTitles: {
        tournamentSchedules: "대회 일정",
        todaysMatches: "오늘의 경기",
        sponsors: "스폰서",
        communityPartners: "커뮤니티 파트너",
        clubs: "클럽",
        lessons: "레슨",
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
