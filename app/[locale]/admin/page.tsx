import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminHub } from "@/app/admin/AdminHub";
import { prisma } from "@/lib/prisma";
import { COURT_OPTIONS } from "@/lib/content/courts";
import { renumberTeamsInCategory } from "@/lib/createTeam";
import { getFinalistPlayerKeys } from "@/lib/matches";

function extractGroup(matchId: string): string | null {
  const m = matchId.match(/PRE([A-Z])(\d+)$/i);
  return m ? m[1].toUpperCase() : null;
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") redirect("/admin/login");

  const [regRows, teamRowsInitial, matchRows, playerRows, catRows, statusRows, adminRows, finalistKeys] = await Promise.all([
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
        roundRef: { select: { code: true, labelEn: true, labelKo: true } },
      },
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }, { id: "asc" }],
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

  const [prizeRows, rawCourtBookings] = await Promise.all([
    prisma.categoryPrize.findMany({
      orderBy: [{ tournamentYear: "desc" }, { isDoubles: "desc" }, { teamCountBracket: "asc" }],
    }),
    prisma.courtBooking.findMany({
      orderBy: [{ date: "asc" }, { courtId: "asc" }],
    }),
  ]);

  // Build the set of active (non-cancelled) player+category+year keys from registrations.
  // Use this to detect stale teams whose members no longer have any registration.
  const activePlayerCatYear = new Set<string>();
  for (const reg of regRows) {
    if (reg.status !== "Cancelled") {
      activePlayerCatYear.add(`${reg.tournamentYear}|${reg.categoryId}|${reg.playerId}`);
      if (reg.partnerId) {
        activePlayerCatYear.add(`${reg.tournamentYear}|${reg.categoryId}|${reg.partnerId}`);
      }
    }
  }

  const staleTeams = teamRowsInitial.filter((team) => {
    const m1Active = activePlayerCatYear.has(`${team.tournamentYear}|${team.categoryId}|${team.member1PlayerId}`);
    const m2Active = team.member2PlayerId
      ? activePlayerCatYear.has(`${team.tournamentYear}|${team.categoryId}|${team.member2PlayerId}`)
      : false;
    return !m1Active && !m2Active;
  });

  let teamRows = teamRowsInitial;
  if (staleTeams.length > 0) {
    const affectedCats = new Set<string>();
    for (const team of staleTeams) {
      await prisma.team.delete({
        where: { tournamentYear_id: { tournamentYear: team.tournamentYear, id: team.id } },
      });
      affectedCats.add(`${team.tournamentYear}|${team.categoryId}`);
    }
    for (const key of affectedCats) {
      const [yearStr, catId] = key.split("|");
      await renumberTeamsInCategory(parseInt(yearStr, 10), catId);
    }
    // Re-fetch teams so IDs reflect any renumbering
    teamRows = await prisma.team.findMany({
      include: {
        category: { select: { label: true, labelKo: true, isDoubles: true } },
        member1: { select: { fullNameEn: true, fullNameKo: true } },
        member2: { select: { fullNameEn: true, fullNameKo: true } },
      },
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }],
    });
  }

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
    roundCode: r.roundRef?.code ?? null,
    roundLabel: r.roundRef?.labelEn ?? null,
    roundLabelKo: r.roundRef?.labelKo ?? null,
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
    prelimFormat: c.prelimFormat ?? null,
  }));

  const categoryStatuses = statusRows.map((s) => ({
    tournamentYear: s.tournamentYear,
    categoryId: s.categoryId,
    status: s.status,
  }));

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

  // ─── Court bookings enrichment ───────────────────────────────────────────────
  const bookingMatchIds: string[] = [...new Set((rawCourtBookings as Array<{ matchId: string | null }>).map((b) => b.matchId).filter((id): id is string => id !== null))];
  const bookingTeamIds: string[] = [...new Set((rawCourtBookings as Array<{ teamId: string | null }>).map((b) => b.teamId).filter((id): id is string => id !== null))];

  const [bookingMatchRows, bookingTeamRows] = await Promise.all([
    bookingMatchIds.length > 0
      ? prisma.match.findMany({
          where: { id: { in: bookingMatchIds } },
          include: {
            team1: { include: { member1: { select: { fullNameEn: true, fullNameKo: true } }, member2: { select: { fullNameEn: true, fullNameKo: true } } } },
            team2: { include: { member1: { select: { fullNameEn: true, fullNameKo: true } }, member2: { select: { fullNameEn: true, fullNameKo: true } } } },
            category: { select: { label: true, labelKo: true } },
          },
        })
      : Promise.resolve([]),
    bookingTeamIds.length > 0
      ? prisma.team.findMany({
          where: { id: { in: bookingTeamIds } },
          include: {
            member1: { select: { fullNameEn: true, fullNameKo: true } },
            member2: { select: { fullNameEn: true, fullNameKo: true } },
            category: { select: { label: true, labelKo: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const bookingMatchMap = new Map(bookingMatchRows.map((m) => [m.id, m]));
  const bookingTeamMap = new Map(bookingTeamRows.map((t) => [t.id, t]));
  const courtMap = new Map(COURT_OPTIONS.map((c) => [c.id, c]));

  const courtBookings = rawCourtBookings.map((b) => {
    const court = courtMap.get(b.courtId) ?? null;
    const match = b.matchId ? (bookingMatchMap.get(b.matchId) ?? null) : null;
    const team = b.teamId ? (bookingTeamMap.get(b.teamId) ?? null) : null;
    return {
      id: b.id,
      courtId: b.courtId,
      date: b.date,
      teamId: b.teamId,
      matchId: b.matchId,
      status: b.status,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      court: court ? { name: court.name, nameKo: court.nameKo, timeSlot: court.timeSlot } : null,
      team: team ? { id: team.id, member1: team.member1, member2: team.member2 ?? null, category: team.category } : null,
      match: match ? {
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        team1: match.team1 ? { member1: match.team1.member1, member2: match.team1.member2 ?? null } : null,
        team2: match.team2 ? { member1: match.team2.member1, member2: match.team2.member2 ?? null } : null,
        category: match.category,
      } : null,
    };
  });

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
      courtBookings={courtBookings}
    />
  );
}
