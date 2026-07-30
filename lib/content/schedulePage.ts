import { menuLabelForHref } from "./menu";

export const schedulePage = {
  en: {
    schedulePage: {
      heroTitle: menuLabelForHref("/schedule", "en"),
      chooseDateAria: "Date",
      calendarDialogAria: "Calendar",
      selectDatePlaceholder: "Date",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      thisWeek: "This Week",
      yearLabel: "Tournament year",
      phasesSectionTitle: "Tournament schedule overview",
      phasesColumnPhase: "Phase",
      phasesColumnDates: "Dates",
      phases: {
        prelims: "Preliminaries",
        quarterfinals: "Quarterfinals",
        semifinals: "Semifinals",
        finals: "Finals",
      },
    },
  },
  ko: {
    schedulePage: {
      heroTitle: menuLabelForHref("/schedule", "ko"),
      chooseDateAria: "날짜",
      calendarDialogAria: "달력",
      selectDatePlaceholder: "날짜",
      previousMonth: "이전 달",
      nextMonth: "다음 달",
      thisWeek: "이번 주",
      yearLabel: "대회 연도",
      phasesSectionTitle: "대회 일정 개요",
      phasesColumnPhase: "단계",
      phasesColumnDates: "기간",
      phases: {
        prelims: "예선",
        quarterfinals: "8강",
        semifinals: "준결승",
        finals: "결승",
      },
    },
  },
} as const;
