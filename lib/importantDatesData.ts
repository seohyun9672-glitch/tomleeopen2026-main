
export type ImportantDateEntry =
  | { type: "date"; label: string; date: string; valueDisplay: string; labelKo?: string; valueDisplayKo?: string; locationEn?: string; locationKo?: string }
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
    labelKo: "대회 기간",
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
    type: "date",
    label: "Draw publish",
    date: "2026-06-26",
    labelKo: "대진표 발표",
    valueDisplay: "June 26",  
    valueDisplayKo: "6월 26일",
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
    locationEn: "Gates Park Tennis Courts",
    locationKo: "게이츠 파크 테니스 코트",
  },
];