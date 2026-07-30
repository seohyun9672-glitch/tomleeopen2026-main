export const matchUi = {
  en: {
    matchUi: {
      statusScheduled: "Scheduled",
      statusCompleted: "Completed",
      statusCancelled: "Cancelled",
      statusPending: "Pending",
      withdrew: "Walkover",
      advancing: "Advanced",
      rankAria: (rank: number) => `Rank ${rank}`,
    },
  },
  ko: {
    matchUi: {
      statusScheduled: "예정",
      statusCompleted: "종료",
      statusCancelled: "취소",
      statusPending: "대기",
      withdrew: "기권",
      advancing: "진출",
      rankAria: (rank: number) => `순위 ${rank}`,
    },
  },
} as const;
