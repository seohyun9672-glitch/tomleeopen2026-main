export const matchUi = {
  en: {
    matchUi: {
      statusScheduled: "Scheduled",
      statusCompleted: "Completed",
      statusCancelled: "Cancelled",
      statusPostponed: "Postponed",
      statusPending: "Pending",
      withdrew: "Withdrew",
      rankAria: (rank: number) => `Rank ${rank}`,
    },
  },
  ko: {
    matchUi: {
      statusScheduled: "예정",
      statusCompleted: "종료",
      statusCancelled: "취소",
      statusPostponed: "연기",
      statusPending: "대기",
      withdrew: "기권",
      rankAria: (rank: number) => `순위 ${rank}`,
    },
  },
} as const;
