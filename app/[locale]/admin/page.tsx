import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminHub } from "@/app/admin/AdminHub";
import { prisma } from "@/lib/prisma";
import { createTeamFromRegistration } from "@/lib/createTeam";
import { getFinalistPlayerKeys } from "@/lib/matches";

function extractGroup(matchId: string): string | null {
  const m = matchId.match(/PRE([A-Z])(\d+)$/i);
  return m ? m[1].toUpperCase() : null;
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") redirect("/admin/login");

  const [regRows, teamRows, matchRows, playerRows, catRows, statusRows, adminRows, finalistKeys] = await Promise.all([
    prisma.tournamentRegistration.findMany({
      include: {
        player: {
          select: {
            id: true,
            fullNameEn: true,
            fullNameKo: true,
            email: true,
            phone: true,
            ntrp: true,
            clubs: { select: { clubCode: true } },
          },
        },
        partner: {
          select: {
            id: true,
            fullNameEn: true,
            fullNameKo: true,
            email: true,
            phone: true,
            ntrp: true,
            clubs: { select: { clubCode: true } },
          },
        },
        category: { select: { label: true, labelKo: true, isDoubles: true } },
      },
      orderBy: [{ tournamentYear: "desc" }, { createdAt: "desc" }],
    }),
    prisma.team.findMany({
      include: {
        category: { select: { label: true, labelKo: true, isDoubles: true } },
        member1: { select: { fullNameEn: true, fullNameKo: true } },
        member2: { select: { fullNameEn: true, fullNameKo: true } },
      },
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }],
    }),
    prisma.match.findMany({
      include: {
        category: { select: { label: true, labelKo: true } },
        round: { select: { code: true, labelEn: true, labelKo: true } },
      },
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }, { matchNumber: "asc" }],
    }),
    prisma.player.findMany({
      select: {
        id: true,
        fullNameEn: true,
        fullNameKo: true,
        email: true,
        phone: true,
        ntrp: true,
        gender: true,
        clubs: { select: { clubCode: true } },
      },
      orderBy: { fullNameEn: "asc" },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.categoryYearStatus.findMany({
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }],
    }),
    prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, active: true, createdAt: true },
    }),
    getFinalistPlayerKeys(),
  ]);

  const prizeRows = await prisma.categoryPrize.findMany({
    orderBy: [{ tournamentYear: "desc" }, { isDoubles: "desc" }, { teamCountBracket: "asc" }],
  });

  const registrations = regRows.map((r) => ({
    id: r.id,
    tournamentYear: r.tournamentYear,
    categoryId: r.categoryId,
    categoryLabel: r.category.label,
    categoryLabelKo: r.category.labelKo,
    isDoubles: r.category.isDoubles,
    status: r.status,
    playerId: r.player.id,
    playerNameEn: r.player.fullNameEn,
    playerNameKo: r.player.fullNameKo,
    playerEmail: r.player.email,
    playerPhone: r.player.phone,
    playerNtrp: r.player.ntrp,
    playerClubs: r.player.clubs.map((c) => c.clubCode),
    partnerId: r.partner?.id ?? null,
    partnerNameEn: r.partner?.fullNameEn ?? null,
    partnerNameKo: r.partner?.fullNameKo ?? null,
    partnerEmail: r.partner?.email ?? null,
    partnerPhone: r.partner?.phone ?? null,
    partnerNtrp: r.partner?.ntrp ?? null,
    partnerClubs: r.partner?.clubs.map((c) => c.clubCode) ?? [],
    nameOnEtransfer: r.nameOnEtransfer,
    photoVideoConsent: r.photoVideoConsent,
    paymentReceived: r.paymentReceived,
    notes: r.notes,
    adminComments: r.adminComments,
    createdAt: r.createdAt.toISOString(),
  }));

  // Teams come directly from Team records (created from registrations via createTeamFromRegistration)
  const catSortOrder = new Map(catRows.map((c) => [c.id, c.sortOrder]));
  const teams = teamRows
    .map((t) => ({
      teamId: t.id,
      tournamentYear: t.tournamentYear,
      categoryId: t.categoryId,
      categoryLabel: t.category.label,
      categoryLabelKo: t.category.labelKo,
      isDoubles: t.category.isDoubles,
      seed: t.seed ?? null,
      member1NameEn: t.member1.fullNameEn.trim() || t.member1.fullNameKo?.trim() || "",
      member1NameKo: t.member1.fullNameKo?.trim() || null,
      member2NameEn: t.member2?.fullNameEn.trim() || t.member2?.fullNameKo?.trim() || null,
      member2NameKo: t.member2?.fullNameKo?.trim() || null,
    }))
    .sort((a, b) => {
      const catDiff = (catSortOrder.get(a.categoryId) ?? 0) - (catSortOrder.get(b.categoryId) ?? 0);
      if (catDiff !== 0) return catDiff;
      if (a.seed === b.seed) return 0;
      if (!a.seed) return 1;
      if (!b.seed) return -1;
      return a.seed.localeCompare(b.seed);
    });

  // Team member lookup for matches: keyed by "${tournamentYear}-${teamId}"
  const teamMemberMap = new Map<string, { namesEn: string[]; namesKo: string[] }>();
  for (const t of teamRows) {
    teamMemberMap.set(`${t.tournamentYear}-${t.id}`, {
      namesEn: [
        t.member1.fullNameEn.trim() || t.member1.fullNameKo?.trim() || "",
        t.member2?.fullNameEn.trim() || t.member2?.fullNameKo?.trim() || null,
      ].filter(Boolean) as string[],
      namesKo: [
        t.member1.fullNameKo?.trim() || t.member1.fullNameEn.trim() || "",
        t.member2 ? (t.member2.fullNameKo?.trim() || t.member2.fullNameEn.trim() || null) : null,
      ].filter(Boolean) as string[],
    });
  }

  const matches = matchRows.map((r) => {
    const t1 = r.team1Id ? teamMemberMap.get(`${r.tournamentYear}-${r.team1Id}`) : null;
    const t2 = r.team2Id ? teamMemberMap.get(`${r.tournamentYear}-${r.team2Id}`) : null;
    return {
    id: r.id,
    tournamentYear: r.tournamentYear,
    categoryId: r.categoryId,
    categoryLabel: r.category.label,
    categoryLabelKo: r.category.labelKo,
    roundCode: r.round?.code ?? null,
    roundLabel: r.round?.labelEn ?? null,
    roundLabelKo: r.round?.labelKo ?? null,
    group: extractGroup(r.id),
    team1Names: t1?.namesEn ?? [],
    team1NamesKo: t1?.namesKo ?? [],
    team2Names: t2?.namesEn ?? [],
    team2NamesKo: t2?.namesKo ?? [],
    matchStatus: r.matchStatus,
    date: r.date,
    time: r.time,
    location: r.location,
    set1T1: r.set1ScoreTeam1,
    set2T1: r.set2ScoreTeam1,
    set3T1: r.set3ScoreTeam1,
    set1T2: r.set1ScoreTeam2,
    set2T2: r.set2ScoreTeam2,
    set3T2: r.set3ScoreTeam2,
    ball: r.ball ?? null,
    comment: r.comment,
    };
  });

  const players = playerRows.map((p) => ({
    id: p.id,
    fullNameEn: p.fullNameEn,
    fullNameKo: p.fullNameKo,
    email: p.email,
    phone: p.phone,
    ntrp: p.ntrp,
    gender: p.gender,
    clubs: p.clubs.map((c) => c.clubCode),
  }));

  const categories = catRows.map((c) => ({
    id: c.id,
    label: c.label,
    labelKo: c.labelKo,
    category: c.category,
    categoryKo: c.categoryKo,
    tier: c.tier,
    tierKo: c.tierKo,
    isDoubles: c.isDoubles,
    ntrp: c.ntrp,
    sortOrder: c.sortOrder,
  }));

  // Auto-confirm categories that have reached 4+ teams
  const teamCountByYearCat = new Map<string, { year: number; categoryId: string; count: number }>();
  for (const team of teams) {
    const key = `${team.tournamentYear}::${team.categoryId}`;
    if (!teamCountByYearCat.has(key)) {
      teamCountByYearCat.set(key, { year: team.tournamentYear, categoryId: team.categoryId, count: 0 });
    }
    teamCountByYearCat.get(key)!.count++;
  }
  const existingStatusMap = new Map(statusRows.map((s) => [`${s.tournamentYear}::${s.categoryId}`, s.status]));
  const autoConfirmEntries = [...teamCountByYearCat.values()].filter(
    ({ year, categoryId, count }) =>
      count >= 4 && existingStatusMap.get(`${year}::${categoryId}`) !== "Active"
  );
  if (autoConfirmEntries.length > 0) {
    await Promise.all(
      autoConfirmEntries.map(({ year, categoryId }) =>
        prisma.categoryYearStatus.upsert({
          where: { tournamentYear_categoryId: { tournamentYear: year, categoryId } },
          update: { status: "Active" },
          create: { tournamentYear: year, categoryId, status: "Active" },
        })
      )
    );
  }
  const autoConfirmedSet = new Set(autoConfirmEntries.map((e) => `${e.year}::${e.categoryId}`));

  const categoryStatuses = [
    ...statusRows.map((s) => ({
      tournamentYear: s.tournamentYear,
      categoryId: s.categoryId,
      status: autoConfirmedSet.has(`${s.tournamentYear}::${s.categoryId}`) ? "Active" : s.status,
    })),
    // Newly created rows for categories that had no record yet
    ...autoConfirmEntries
      .filter(({ year, categoryId }) => !existingStatusMap.has(`${year}::${categoryId}`))
      .map(({ year, categoryId }) => ({ tournamentYear: year, categoryId, status: "Active" })),
  ];

  const adminUsers = adminRows.map((u) => ({
    id: u.id,
    email: u.email,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
  }));

  const prizes = prizeRows.map((p) => ({
    id: p.id,
    tournamentYear: p.tournamentYear,
    isDoubles: p.isDoubles,
    teamCountBracket: p.teamCountBracket,
    first: p.first,
    second: p.second,
    third: p.third,
    fourth: p.fourth,
  }));

  return (
    <AdminHub
      registrations={registrations}
      teams={teams}
      matches={matches}
      players={players}
      categories={categories}
      categoryStatuses={categoryStatuses}
      adminUsers={adminUsers}
      finalists={[...finalistKeys]}
      prizes={prizes}
    />
  );
}
