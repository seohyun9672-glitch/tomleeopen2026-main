import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROUNDS = [
  { id: 1, code: "Pre", labelEn: "Preliminaries", labelKo: "예선", sortOrder: 0 },
  { id: 2, code: "R16", labelEn: "Round of 16",   labelKo: "16강", sortOrder: 1 },
  { id: 3, code: "QF",  labelEn: "Quarterfinals",  labelKo: "8강",  sortOrder: 2 },
  { id: 4, code: "SF",  labelEn: "Semifinals",     labelKo: "준결승", sortOrder: 3 },
  { id: 5, code: "F",   labelEn: "Final",          labelKo: "결승",  sortOrder: 4 },
];

const PRIZES_2025 = [
  { tournamentYear: 2025, isDoubles: true,  teamCountBracket: "12+", first: 700, second: 400, third: 100, fourth: 100 },
  { tournamentYear: 2025, isDoubles: true,  teamCountBracket: "6+",  first: 500, second: 300, third: 100, fourth: 100 },
  { tournamentYear: 2025, isDoubles: true,  teamCountBracket: "4-5", first: 200, second: 0,   third: 0,   fourth: 0   },
  { tournamentYear: 2025, isDoubles: false, teamCountBracket: "12+", first: 500, second: 300, third: 50,  fourth: 50  },
  { tournamentYear: 2025, isDoubles: false, teamCountBracket: "6+",  first: 300, second: 200, third: 50,  fourth: 50  },
  { tournamentYear: 2025, isDoubles: false, teamCountBracket: "4-5", first: 200, second: 0,   third: 0,   fourth: 0   },
];

async function main() {
  for (const round of ROUNDS) {
    await prisma.round.upsert({
      where: { code: round.code },
      update: { labelEn: round.labelEn, labelKo: round.labelKo, sortOrder: round.sortOrder },
      create: round,
    });
  }
  console.log("Seeded rounds:", ROUNDS.map((r) => r.code).join(", "));

  for (const p of PRIZES_2025) {
    await prisma.categoryPrize.upsert({
      where: { tournamentYear_isDoubles_teamCountBracket: { tournamentYear: p.tournamentYear, isDoubles: p.isDoubles, teamCountBracket: p.teamCountBracket } },
      update: { first: p.first, second: p.second, third: p.third, fourth: p.fourth },
      create: p,
    });
  }
  console.log("Seeded 2025 prizes");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
