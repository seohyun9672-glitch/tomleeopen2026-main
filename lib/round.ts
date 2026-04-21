export type RoundInfo = {
  id: number;
  code: string;
  labelEn: string;
  labelKo: string;
  sortOrder: number;
};

// Round code constants matching the seeded Round.code values.
export const ROUND_PRE = "Pre";
export const ROUND_R16 = "R16";
export const ROUND_QF  = "QF";
export const ROUND_SF  = "SF";
export const ROUND_F   = "F";