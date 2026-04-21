export const NTRP_LEVELS = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0+"] as const;
export type NTRPLevel = (typeof NTRP_LEVELS)[number];