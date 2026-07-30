
export type ImportantDateEntry =
  | { type: "date"; label: string; date: string; valueDisplay: string; labelKo?: string; valueDisplayKo?: string; locationEn?: string; locationKo?: string; rainDate?: string }
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

export const importantDates: Record<number, ImportantDateEntry[]> = {
  2025: [
    {
      type: "range",
      label: "Preliminaries",
      startDate: "2025-07-05",
      endDate: "2025-08-03",
      valueDisplay: "Jul 5 – Aug 3",
      labelKo: "예선",
      valueDisplayKo: "7월 5일 – 8월 3일",
    },
    {
      type: "range",
      label: "Quarterfinals",
      startDate: "2025-08-04",
      endDate: "2025-08-12",
      valueDisplay: "Aug 4 – Aug 12",
      labelKo: "8강",
      valueDisplayKo: "8월 4일 – 8월 12일",
    },
    {
      type: "range",
      label: "Semifinals",
      startDate: "2025-08-13",
      endDate: "2025-08-20",
      valueDisplay: "Aug 13 – Aug 20",
      labelKo: "4강",
      valueDisplayKo: "8월 13일 – 8월 20일",
    },
    {
      type: "date",
      label: "Final",
      date: "2025-08-23",
      valueDisplay: "Aug 23",
      labelKo: "결승",
      valueDisplayKo: "8월 23일",
    },
  ],
  2024: [
    {
      type: "date",
      label: "Final",
      date: "2024-08-31",
      valueDisplay: "Aug 31",
      labelKo: "결승",
      valueDisplayKo: "8월 31일",
    },
  ],
  2026: [
    {
      type: "range",
      label: "Tournament",
      startDate: "2026-06-29",
      endDate: "2026-08-22",
      valueDisplay: "June 29 – August 22, 2026",
      labelKo: "대회 기간",
      valueDisplayKo: "2026년 6월 29일 – 8월 22일",
    },
    {
      type: "range",
      label: "Registration",
      startDate: "2026-06-01",
      endDate: "2026-06-24",
      valueDisplay: "June 1 – 24",
      labelKo: "등록",
      valueDisplayKo: "6월 1일 – 24일",
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
      startDate: "2026-06-29",
      endDate: "2026-08-03",
      valueDisplay: "Jun 29 – Aug 3",
      labelKo: "예선",
      valueDisplayKo: "6월 29일 – 8월 3일",
    },
    {
      type: "range",
      label: "Quarterfinals",
      startDate: "2026-08-03",
      endDate: "2026-08-12",
      valueDisplay: "Aug 3 – Aug 12",
      labelKo: "8강",
      valueDisplayKo: "8월 3일 – 8월 12일",
    },
    {
      type: "range",
      label: "Semifinals",
      startDate: "2026-08-12",
      endDate: "2026-08-20",
      valueDisplay: "Aug 12 – Aug 20",
      labelKo: "4강",
      valueDisplayKo: "8월 12일 – 8월 20일",
    },
    {
      type: "date",
      label: "Final",
      date: "2026-08-22",
      rainDate: "2026-08-29",
      valueDisplay: "Aug 22 (Rain date: Aug 29)",
      labelKo: "결승",
      valueDisplayKo: "8월 22일 (우천 시: 8월 29일)",
      locationEn: "Gates Park Tennis Courts",
      locationKo: "게이츠 파크 테니스 코트",
    },
  ],
};

export function getImportantDates(year: number): ImportantDateEntry[] {
  return importantDates[year] ?? [];
}
