import { OVERVIEW_PRIZE_TABLE_ROWS, OVERVIEW_PRIZE_TABLE_ROWS_KO } from "@/lib/prizes";
import { EXTERNAL_LINKS } from "@/lib/externalLinks";
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
          { label: "Organized by", value: "Tomlee Tennis Organizing Committee" },
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
        tableRows: OVERVIEW_PRIZE_TABLE_ROWS,
      },
      preliminariesCourt: {
        title: "Venue",
        preliminariesHeading: "Preliminaries courts",
        finalHeading: "Final",
        description: "Prelimiaries match location and time can be arranged by the teams. We offer courts for preliminary matches during the preliminaries period, subject to availability on a first come, first served basis. Players must notify the admin in advance to confirm the schedule.",
        finals: {
          location: "Gates Park Tennis Courts",
          time: "TBD",
          dateDisplay: importantDatesRowsEn.find((r) => r.label === "Final")?.value ?? "TBD",
        },
        prelimHeaders: ["Location", "Date", "Day", "Time"],
        prelimRows: [
          {
            location: "Fraser Heights Court 1, 2",
            href: EXTERNAL_LINKS.fraserHeightsCourt12,
            date: "June 27 – Aug 18",
            day: "Tuesday",
            time: "7:00 PM – 9:00 PM",
          },
          {
            location: "Fraser Heights Court North",
            href: EXTERNAL_LINKS.fraserHeightsCourtNorth,
            date: "June 27 – Aug 16",
            day: "Sunday",
            time: "5:00 PM – 7:00 PM",
          },
          {
            location: "Gates Park Tennis Courts",
            href: EXTERNAL_LINKS.gatesParkTennisCourts,
            locationNote: "(Court number TBD)",
            date: "June 27 – Aug 16",
            day: "Sunday",
            time: "5:00 PM – 7:00 PM",
          },
        ],
      },
    },
  },
  ko: {
    overviewPage: {
      heroTitle: "개요",
      overview: {
        title: "개요",
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
        tableRows: OVERVIEW_PRIZE_TABLE_ROWS_KO,
      },
      preliminariesCourt: {
        title: "장소",
        preliminariesHeading: "예선 코트",
        finalHeading: "본선",
        description: "예선 기간 동안 예선 경기의 장소와 시간은 팀 간 협의로 조정할 수 있습니다. 예선 경기용 코트는 선착순으로 제공되며, 이용을 원하시면 사전에 운영진에게 연락해 일정을 확정해 주세요.",
        finals: {
          location: "게이츠 파크 테니스 코트",
          time: "추후 확정",
          dateDisplay: importantDatesRowsKo.find((r) => r.label === "결승")?.value ?? "추후 확정",
        },
        prelimHeaders: ["장소", "날짜", "요일", "시간"],
        prelimRows: [
          {
            location: "Fraser Heights Court 1, 2",
            href: EXTERNAL_LINKS.fraserHeightsCourt12,
            date: "6월 27일 – 8월 18일",
            day: "화요일",
            time: "오후 7:00 – 9:00",
          },
          {
            location: "Fraser Heights Court North",
            href: EXTERNAL_LINKS.fraserHeightsCourtNorth,
            date: "6월 27일 – 8월 16일",
            day: "일요일",
            time: "오후 5:00 – 7:00",
          },
          {
            location: "Gates Park Tennis Courts",
            href: EXTERNAL_LINKS.gatesParkTennisCourts,
            locationNote: "(코트 번호 추후 공지)",
            date: "6월 27일 – 8월 16일",
            day: "일요일",
            time: "오후 5:00 – 7:00",
          },
        ],
      },
    },
  },
} as const;
