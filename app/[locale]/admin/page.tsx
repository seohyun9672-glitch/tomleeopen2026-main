import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminHub } from "@/app/admin/AdminHub";
import { prisma } from "@/lib/prisma";

function extractGroup(matchId: string): string | null {
  const m = matchId.match(/PRE([A-Z])(\d+)$/i);
  return m ? m[1].toUpperCase() : null;
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") redirect("/admin/login");

  const [regRows, matchRows, playerRows, catRows, statusRows, adminRows] = await Promise.all([
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
    prisma.match.findMany({
      include: {
        category: { select: { label: true, labelKo: true } },
        round: { select: { code: true, labelEn: true, labelKo: true } },
        team1: {
          include: {
            member1: { select: { fullNameEn: true, fullNameKo: true } },
            member2: { select: { fullNameEn: true, fullNameKo: true } },
          },
        },
        team2: {
          include: {
            member1: { select: { fullNameEn: true, fullNameKo: true } },
            member2: { select: { fullNameEn: true, fullNameKo: true } },
          },
        },
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
  ]);

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

  const matches = matchRows.map((r) => ({
    id: r.id,
    tournamentYear: r.tournamentYear,
    categoryId: r.categoryId,
    categoryLabel: r.category.label,
    categoryLabelKo: r.category.labelKo,
    roundCode: r.round?.code ?? null,
    roundLabel: r.round?.labelEn ?? null,
    roundLabelKo: r.round?.labelKo ?? null,
    group: extractGroup(r.id),
    team1Names: r.team1
      ? ([r.team1.member1.fullNameEn, r.team1.member2?.fullNameEn ?? null].filter(Boolean) as string[])
      : [],
    team1NamesKo: r.team1
      ? ([
          r.team1.member1.fullNameKo?.trim() || r.team1.member1.fullNameEn.trim(),
          r.team1.member2 ? (r.team1.member2.fullNameKo?.trim() || r.team1.member2.fullNameEn.trim()) : null,
        ].filter(Boolean) as string[])
      : [],
    team2Names: r.team2
      ? ([r.team2.member1.fullNameEn, r.team2.member2?.fullNameEn ?? null].filter(Boolean) as string[])
      : [],
    team2NamesKo: r.team2
      ? ([
          r.team2.member1.fullNameKo?.trim() || r.team2.member1.fullNameEn.trim(),
          r.team2.member2 ? (r.team2.member2.fullNameKo?.trim() || r.team2.member2.fullNameEn.trim()) : null,
        ].filter(Boolean) as string[])
      : [],
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
    comment: r.comment,
  }));

  const players = playerRows.map((p) => ({
    id: p.id,
    fullNameEn: p.fullNameEn,
    fullNameKo: p.fullNameKo,
    email: p.email,
    phone: p.phone,
    ntrp: p.ntrp,
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

  return (
    <AdminHub
      registrations={registrations}
      matches={matches}
      players={players}
      categories={categories}
      categoryStatuses={categoryStatuses}
      adminUsers={adminUsers}
    />
  );
}
