
export type ImportantDateEntry =
  | { type: "date"; label: string; date: string; valueDisplay: string; labelKo?: string; valueDisplayKo?: string }
  | {
      type: "range";
      label: string;
      startDate: string;
      endDate: string;
      valueDisplay: string;
      labelKo?: string;
      valueDisplayKo?: string;
    }
  | { type: "text"; label: string; value: string; labelKo?: string; valueKo?: string };

export const importantDates: ImportantDateEntry[] = [
  {
    type: "range",
    label: "Tournament",
    startDate: "2026-06-01",
    endDate: "2026-08-22",
    valueDisplay: "June 1 – August 22, 2026",
    labelKo: "대회",
    valueDisplayKo: "2026년 6월 1일 – 8월 22일",
  },
  {
    type: "range",
    label: "Registration",
    startDate: "2026-06-01",
    endDate: "2026-06-20",
    valueDisplay: "June 1 – 20",
    labelKo: "등록",
    valueDisplayKo: "6월 1일 – 20일",
  },
  {
    type: "text",
    label: "Draw published",
    value: "After registration closes",
    labelKo: "대진표 발표",
    valueKo: "등록 마감 후",
  },
  {
    type: "range",
    label: "Preliminaries",
    startDate: "2026-06-27",
    endDate: "2026-08-02",
    valueDisplay: "Jun 27 – Aug 2",
    labelKo: "예선",
    valueDisplayKo: "6월 27일 – 8월 2일",
  },
  {
    type: "range",
    label: "Quarterfinals",
    startDate: "2026-08-03",
    endDate: "2026-08-09",
    valueDisplay: "Aug 3 – Aug 9",
    labelKo: "8강",
    valueDisplayKo: "8월 3일 – 8월 9일",
  },
  {
    type: "range",
    label: "Semifinals",
    startDate: "2026-08-10",
    endDate: "2026-08-16",
    valueDisplay: "Aug 10 – Aug 16",
    labelKo: "4강",
    valueDisplayKo: "8월 10일 – 8월 16일",
  },
  {
    type: "date",
    label: "Final",
    date: "2026-08-22",
    valueDisplay: "Aug 22 (Rain date: Aug 29)",
    labelKo: "결승",
    valueDisplayKo: "8월 22일 (우천 시: 8월 29일)",
  },
];

export const tournamentFinalVenueDetails = {
  locationEn: "Gates Park Tennis Courts",
  locationKo: "게이츠 파크 테니스 코트",
  timeEn: "TBD",
  timeKo: "추후 확정",
} as const;

export type YearCategoryFormatRow = {
  categoryId: string;
  groupFormat: string;
  teamsToFinals: string;
  groupFormatKo: string;
  teamsToFinalsKo: string;
  prelimsDates: string;
  quarterFinalsDate: string;
  semiFinalsDate: string;
  finalsDate: string;
  prelimsDatesKo: string;
  quarterFinalsDateKo: string;
  semiFinalsDateKo: string;
  finalsDateKo: string;
};

// /** Year/category specific format timeline rows. Extend for additional seasons. */
// export const categoryFormatTimelineByYear: Record<number, YearCategoryFormatRow[]> = {
//   2024: [
//     { categoryId: "MD-B", groupFormat: "Groups A, B (prelims)", teamsToFinals: "Top 2 per group to semifinals", groupFormatKo: "A,B조 예선 진행", teamsToFinalsKo: "각조 1,2위 4강진출", prelimsDates: "TBD", quarterFinalsDate: "N/A", semiFinalsDate: "TBD", finalsDate: "TBD", prelimsDatesKo: "추후 확정", quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: "추후 확정", finalsDateKo: "추후 확정" },
//     { categoryId: "MD-G", groupFormat: "Groups A, B (prelims)", teamsToFinals: "Top 2 per group to semifinals", groupFormatKo: "A,B조 예선 진행", teamsToFinalsKo: "각조 1,2위 4강진출", prelimsDates: "TBD", quarterFinalsDate: "N/A", semiFinalsDate: "TBD", finalsDate: "TBD", prelimsDatesKo: "추후 확정", quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: "추후 확정", finalsDateKo: "추후 확정" },
//     { categoryId: "MD-S", groupFormat: "Preliminaries (seeded pools)", teamsToFinals: "Top teams to finals", groupFormatKo: "시드 기반 예선 풀 운영", teamsToFinalsKo: "상위 팀 결승 진출", prelimsDates: "TBD", quarterFinalsDate: "N/A", semiFinalsDate: "N/A", finalsDate: "TBD", prelimsDatesKo: "추후 확정", quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: "해당 없음", finalsDateKo: "추후 확정" },
//     { categoryId: "MS-B", groupFormat: "Knockout bracket", teamsToFinals: "Winners advance (R16 -> QF -> SF -> Final)", groupFormatKo: "토너먼트 대진", teamsToFinalsKo: "승자 진출 (16강 -> 8강 -> 준결승 -> 결승)", prelimsDates: "TBD", quarterFinalsDate: "TBD", semiFinalsDate: "TBD", finalsDate: "TBD", prelimsDatesKo: "추후 확정", quarterFinalsDateKo: "추후 확정", semiFinalsDateKo: "추후 확정", finalsDateKo: "추후 확정" },
//     { categoryId: "MS-S", groupFormat: "Preliminaries only", teamsToFinals: "Standings-based finish (no finals round in match data)", groupFormatKo: "예선만 진행", teamsToFinalsKo: "순위 결정 (매치 데이터상 결승 라운드 없음)", prelimsDates: "TBD", quarterFinalsDate: "N/A", semiFinalsDate: "N/A", finalsDate: "N/A", prelimsDatesKo: "추후 확정", quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: "해당 없음", finalsDateKo: "해당 없음" },
//     { categoryId: "XD-B", groupFormat: "Groups A, B (prelims)", teamsToFinals: "Top 2 per group to semifinals", groupFormatKo: "A,B조 예선 진행", teamsToFinalsKo: "각조 1,2위 4강진출", prelimsDates: "TBD", quarterFinalsDate: "N/A", semiFinalsDate: "TBD", finalsDate: "TBD", prelimsDatesKo: "추후 확정", quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: "추후 확정", finalsDateKo: "추후 확정" },
//   ],
//   2025: [
//     { categoryId: "MD-B", groupFormat: "Groups A, B each with 4 teams", teamsToFinals: "Top 2 per group to semifinals", groupFormatKo: "A,B조 각 4팀씩 구성", teamsToFinalsKo: "각조 1,2위 4강진출", prelimsDates: prelimsEn, quarterFinalsDate: "N/A", semiFinalsDate: semifinalsEn, finalsDate: finalEn, prelimsDatesKo: prelimsKo, quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: semifinalsKo, finalsDateKo: finalKo },
//     { categoryId: "MD-G", groupFormat: "Groups A, B each with 4 teams", teamsToFinals: "Top 2 per group to semifinals", groupFormatKo: "A,B조 각 4팀씩 구성", teamsToFinalsKo: "각조 1,2위 4강진출", prelimsDates: prelimsEn, quarterFinalsDate: "N/A", semiFinalsDate: semifinalsEn, finalsDate: finalEn, prelimsDatesKo: prelimsKo, quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: semifinalsKo, finalsDateKo: finalKo },
//     { categoryId: "MD-S", groupFormat: "Groups A, B, C, D each with 4 teams", teamsToFinals: "Top 2 per group to quarterfinals", groupFormatKo: "A,B,C,D조 각 4팀씩 구성", teamsToFinalsKo: "각조 1,2위 8강진출", prelimsDates: prelimsEn, quarterFinalsDate: quarterfinalsEn, semiFinalsDate: semifinalsEn, finalsDate: finalEn, prelimsDatesKo: prelimsKo, quarterFinalsDateKo: quarterfinalsKo, semiFinalsDateKo: semifinalsKo, finalsDateKo: finalKo },
//     { categoryId: "MS-B", groupFormat: "Groups A, B, C with 4, 4, and 3 teams respectively", teamsToFinals: "Top 2 plus best two 3rd place teams to quarterfinals", groupFormatKo: "A,B,C조 각 4,4,3팀씩 구성", teamsToFinalsKo: "각조 1,2위 그리고 3위팀중 최고 성적 2팀 8강 진출", prelimsDates: prelimsEn, quarterFinalsDate: quarterfinalsEn, semiFinalsDate: semifinalsEn, finalsDate: finalEn, prelimsDatesKo: prelimsKo, quarterFinalsDateKo: quarterfinalsKo, semiFinalsDateKo: semifinalsKo, finalsDateKo: finalKo },
//     { categoryId: "MS-S", groupFormat: "Groups A, B each with 3 teams", teamsToFinals: "Top 2 per group to semifinals", groupFormatKo: "A,B조 각 3팀씩 구성", teamsToFinalsKo: "각조 1,2위 4강진출", prelimsDates: prelimsEn, quarterFinalsDate: "N/A", semiFinalsDate: semifinalsEn, finalsDate: finalEn, prelimsDatesKo: prelimsKo, quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: semifinalsKo, finalsDateKo: finalKo },
//     { categoryId: "XD-B", groupFormat: "Full league format", teamsToFinals: "Top 2 advance to finals", groupFormatKo: "전체 리그 방식", teamsToFinalsKo: "상위 2팀 결승 진출", prelimsDates: prelimsEn, quarterFinalsDate: "N/A", semiFinalsDate: "N/A", finalsDate: finalEn, prelimsDatesKo: prelimsKo, quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: "해당 없음", finalsDateKo: finalKo },
//     { categoryId: "XD-S", groupFormat: "Groups A, B, C each with 3 teams", teamsToFinals: "Top 2 plus best two 3rd place teams to quarterfinals", groupFormatKo: "A,B,C조 각 3팀씩 구성", teamsToFinalsKo: "각조 1,2위 그리고 3위팀중 최고 성적 2팀 8강 진출", prelimsDates: prelimsEn, quarterFinalsDate: quarterfinalsEn, semiFinalsDate: semifinalsEn, finalsDate: finalEn, prelimsDatesKo: prelimsKo, quarterFinalsDateKo: quarterfinalsKo, semiFinalsDateKo: semifinalsKo, finalsDateKo: finalKo },
//     { categoryId: "WD-B", groupFormat: "Full league format", teamsToFinals: "Top 2 advance to finals", groupFormatKo: "전체 리그 방식", teamsToFinalsKo: "상위 2팀 결승 진출", prelimsDates: prelimsEn, quarterFinalsDate: "N/A", semiFinalsDate: "N/A", finalsDate: finalEn, prelimsDatesKo: prelimsKo, quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: "해당 없음", finalsDateKo: finalKo },
//     { categoryId: "WD-S", groupFormat: "Full league format", teamsToFinals: "Top 2 advance to finals", groupFormatKo: "전체 리그 방식", teamsToFinalsKo: "상위 2팀 결승 진출", prelimsDates: prelimsEn, quarterFinalsDate: "N/A", semiFinalsDate: "N/A", finalsDate: finalEn, prelimsDatesKo: prelimsKo, quarterFinalsDateKo: "해당 없음", semiFinalsDateKo: "해당 없음", finalsDateKo: finalKo },
//   ],

