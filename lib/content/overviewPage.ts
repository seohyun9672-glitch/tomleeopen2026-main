import { OVERVIEW_PRIZE_TABLE_ROWS } from "@/lib/prizes";
import { importantDates } from "@/lib/importantDatesData";

const importantDatesRowsEn = importantDates
  .filter((entry) => entry.label !== "Tournament")
  .map((entry) => ({
    label: entry.label,
    value: entry.type === "text" ? entry.value : entry.valueDisplay,
  })) as readonly { label: string; value: string }[];

const importantDatesRowsKo = importantDates
  .filter((entry) => entry.label !== "Tournament")
  .map((entry) => ({
    label: entry.labelKo ?? entry.label,
    value:
      entry.type === "text"
        ? (entry.valueKo ?? entry.value)
        : (entry.valueDisplayKo ?? entry.valueDisplay),
  })) as readonly { label: string; value: string }[];

export const overviewPage = {
  en: {
    overviewPage: {
      heroTitle: "Overview",
      overview: {
        title: "About",
        hostSponsorLookupName: "Tom Lee Sedation Dental Group",
        table: [
          { label: "Event", value: "Tomlee Open 2026" },
          {
            label: "Format",
            value:
              "The preliminaries will be held in a round-robin group format, with match schedules and locations arranged freely through mutual agreement between teams.",
          },
          { label: "Hosted by", value: "Dr. Tom Lee Sedation Dental Group" },
          { label: "Organized by", value: "Tomlee Open Organizing Committee" },
        ],
      },
      importantDatesTitle: "Important dates",
      importantDatesRows: importantDatesRowsEn,
      categories: {
        title: "Categories",
        footerNotes: [
          "Levels based on NTRP; doubles levels are the total of both players' ratings.",
          "Categories may be merged or adjusted depending on participant numbers.",
          "Organizers may adjust level placements if needed.",
        ],
      },
      categoriesTableHeaderCategory: "Category",
      categoriesTableHeaderNtrp: "NTRP",
      prizes: {
        title: "Prizes",
        tableHeaders: ["Match type", "Bracket", "1st", "2nd", "3rd", "4th"],
        tableRows: OVERVIEW_PRIZE_TABLE_ROWS.en,
      },
    },
  },
  ko: {
    overviewPage: {
      heroTitle: "개요",
      overview: {
        title: "대회 요강",
        hostSponsorLookupName: "Tom Lee Sedation Dental Group",
        table: [
          { label: "대회명", value: "탐리오픈 2026" },
          {
            label: "대회 형식",
            value:
              "예선은 라운드로빈 조별 형식으로 진행되며, 경기 일정과 장소는 팀 간 협의를 통해 자유롭게 조율합니다.",
          },
          { label: "주최", value: "Dr. Tom Lee Sedation Dental Group" },
          { label: "주관", value: "탐리오픈 운영 위원회" },
        ],
      },
      importantDatesTitle: "중요 일정",
      importantDatesRows: importantDatesRowsKo,
      categories: {
        title: "대회 종목",
        footerNotes: [
          "레벨은 NTRP 기준이며, 복식 레벨은 두 선수 점수의 합으로 산정됩니다.",
          "참가 인원에 따라 카테고리가 통합되거나 조정될 수 있습니다.",
          "운영진은 필요 시 레벨 배치를 조정할 수 있습니다.",
        ],
      },
      categoriesTableHeaderCategory: "종목",
      categoriesTableHeaderNtrp: "NTRP",
      prizes: {
        title: "상금",
        tableHeaders: ["경기 부문", "참가 규모", "1위", "2위", "3위", "4위"],
        tableRows: OVERVIEW_PRIZE_TABLE_ROWS.ko,
      },
    },
  },
} as const;
