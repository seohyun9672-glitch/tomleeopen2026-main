type PrizeAmounts = { first: number; second: number; third: number; fourth: number };
type PrizeBracket = { minTeams: number } & PrizeAmounts;

export const PRIZE_BRACKETS: Record<number, { singles?: PrizeBracket[]; doubles?: PrizeBracket[]; all?: PrizeBracket[] }> = {
  2024: {
    singles: [
      { minTeams: 12, first: 500, second: 300, third: 50,  fourth: 50  },
      { minTeams: 6,  first: 300, second: 200, third: 50,  fourth: 50  },
      { minTeams: 1,  first: 200, second: 0,   third: 0,   fourth: 0   },
    ],
    doubles: [
      { minTeams: 12, first: 700, second: 400, third: 100, fourth: 100 },
      { minTeams: 6,  first: 500, second: 300, third: 100, fourth: 100 },
      { minTeams: 1,  first: 200, second: 0,   third: 0,   fourth: 0   },
    ],
  },
  2025: {
    singles: [
      { minTeams: 12, first: 500, second: 300, third: 50,  fourth: 50  },
      { minTeams: 6,  first: 300, second: 200, third: 50,  fourth: 50  },
      { minTeams: 1,  first: 200, second: 0,   third: 0,   fourth: 0   },
    ],
    doubles: [
      { minTeams: 12, first: 700, second: 400, third: 100, fourth: 100 },
      { minTeams: 6,  first: 500, second: 300, third: 100, fourth: 100 },
      { minTeams: 1,  first: 200, second: 0,   third: 0,   fourth: 0   },
    ],
  },
  2026: {
    all: [
      { minTeams: 16, first: 1000, second: 300, third: 100, fourth: 100 },
      { minTeams: 12, first: 700,  second: 300, third: 100, fourth: 100 },
      { minTeams: 8,  first: 500,  second: 200, third: 0,   fourth: 0   },
      { minTeams: 5,  first: 300,  second: 100, third: 0,   fourth: 0   },
      { minTeams: 1,  first: 300,  second: 0,   third: 0,   fourth: 0   },
    ],
  },
};

export function getPrizeAmounts(teamCount: number, year: number, isDoubles: boolean): PrizeAmounts | null {
  const entry = PRIZE_BRACKETS[year];
  if (!entry) return null;
  const brackets = (isDoubles ? entry.doubles : entry.singles) ?? entry.all;
  if (!brackets) return null;
  const { first, second, third, fourth } = brackets.find((b) => teamCount >= b.minTeams) ?? brackets[brackets.length - 1];
  return { first, second, third, fourth };
}
