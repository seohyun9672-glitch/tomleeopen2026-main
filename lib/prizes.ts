export type PrizeTableRow = {
  type: string;
  bracket: string;
  first: string;
  second: string;
  third: string;
  fourth: string;
};

/** English overview prize table (amounts + bracket labels). */
export const OVERVIEW_PRIZE_TABLE_ROWS: readonly PrizeTableRow[] = Object.freeze([
  { type: "Doubles", bracket: "12+ teams", first: "$700", second: "$400", third: "$100", fourth: "$100" },
  { type: "", bracket: "6+ teams", first: "$500", second: "$300", third: "$100", fourth: "$100" },
  { type: "", bracket: "4–5 teams", first: "$200", second: "—", third: "—", fourth: "—" },
  { type: "Singles", bracket: "12+ players", first: "$500", second: "$300", third: "$50", fourth: "$50" },
  { type: "", bracket: "6+ players", first: "$300", second: "$200", third: "$50", fourth: "$50" },
  { type: "", bracket: "4–5 players", first: "$200", second: "—", third: "—", fourth: "—" },
]);

/** Korean overview prize table (amounts + bracket labels). */
export const OVERVIEW_PRIZE_TABLE_ROWS_KO: readonly PrizeTableRow[] = Object.freeze([
  { type: "복식", bracket: "12팀 이상", first: "$700", second: "$400", third: "$100", fourth: "$100" },
  { type: "", bracket: "6팀 이상", first: "$500", second: "$300", third: "$100", fourth: "$100" },
  { type: "", bracket: "4–5팀", first: "$200", second: "—", third: "—", fourth: "—" },
  { type: "단식", bracket: "12명 이상", first: "$500", second: "$300", third: "$50", fourth: "$50" },
  { type: "", bracket: "6명 이상", first: "$300", second: "$200", third: "$50", fourth: "$50" },
  { type: "", bracket: "4–5명", first: "$200", second: "—", third: "—", fourth: "—" },
]);
