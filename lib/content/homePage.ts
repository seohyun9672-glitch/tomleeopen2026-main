import { getMenuData } from "@/lib/content/menu";

export const homePage = {
  en: {
    homePage: {
      heroTitle: "Tomlee Open",
      hero: {
        title: "Tomlee Open",
        navLinks: [getMenuData("en").courtBooking, getMenuData("en").schedule, getMenuData("en").draws],
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
      tournamentStats: {
        categories: "Categories",
        competingPlayers: "Competing Players",
        teams: "Teams",
        totalMatches: "Total Matches",
        prizePool: "Prize Pool",
        daysToFinal: "Days to Final",
      },
      tournamentUpdates: {
        sectionTitle: "Tournament Updates",
        registrationOpen: {
          title: "Registration is open",
          message: (count: number, daysLeft: number) =>
            `${count} ${count === 1 ? "player" : "players"} registered as of today. ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left to sign up!`,
        },
        registrationNotOpen: {
          title: "Registration opening soon",
          message: (period: string) => `Registration opens ${period}.`,
        },
        registrationClosed: {
          title: "Registration has closed",
          message: (count: number, period: string) =>
            `The registration period (${period}) has ended. A total of ${count} ${count === 1 ? "player" : "players"} will be competing this year.`,
        },
        drawDay: {
          title: "Today is draw day @8PM",
          message: "The draw will be published once group seeding is complete.",
        },
        drawPublished: {
          title: "Draw published",
          message: "Check the Draws page to see your matches.",
          linkLabel: "View draws",
        },
      },
    },
  },
  ko: {
    homePage: {
      heroTitle: "탐리 오픈",
      hero: {
        title: "탐리 오픈",
        navLinks: [getMenuData("ko").courtBooking, getMenuData("ko").schedule, getMenuData("ko").draws],
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
      tournamentStats: {
        categories: "카테고리",
        competingPlayers: "참가 선수",
        teams: "팀",
        totalMatches: "전체 경기",
        prizePool: "총 상금",
        daysToFinal: "결승까지",
      },
      tournamentUpdates: {
        sectionTitle: "대회 업데이트",
        registrationOpen: {
          title: "등록 진행 중",
          message: (count: number, daysLeft: number) =>
            `오늘 기준으로 ${count}명 등록이 완료되었습니다. 마감까지 ${daysLeft}일 남았습니다.`,
        },
        registrationNotOpen: {
          title: "등록 예정",
          message: (period: string) => `등록은 ${period}에 시작됩니다.`,
        },
        registrationClosed: {
          title: "등록 마감",
          message: (count: number, period: string) =>
            `등록 기간(${period})이 종료되었습니다. 총 ${count}명이 이번 대회에 참가합니다.`,
        },
        drawDay: {
          title: "오늘은 대진표 발표일입니다 @8PM",
          message: "그룹 시드 배정이 완료되면 대진표가 공개됩니다.",
        },
        drawPublished: {
          title: "대진표 발표",
          message: "대진표 페이지에서 경기 일정을 확인하세요.",
          linkLabel: "대진표 보기",
        },
      },
    },
  },
} as const;
