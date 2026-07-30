import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminHub } from "@/app/admin/AdminHub";
import { prisma } from "@/lib/prisma";
import { renumberTeamsInCategory } from "@/lib/createTeam";
import { getFinalistPlayerKeys } from "@/lib/matches";
import { orderTeamMembersForDisplay, getYear } from "@/lib/utils";
import { getPrizeAmounts, PRIZE_BRACKETS } from "@/lib/prizes";
import { applyPostCloseCategoryRules, hasDrawPublishDatePassed } from "@/lib/registrationStatus";

function extractGroup(matchId: string): string | null {
  const m = matchId.match(/PRE([A-Z])(\d+)$/i);
  return m ? m[1].toUpperCase() : null;
}

function naturalMatchIdSort(a: string, b: string): number {
  const splitId = (id: string): [string, number] => {
    const m = /^(.*?)(\d+)$/.exec(id);
    return m ? [m[1]!, parseInt(m[2]!, 10)] : [id, 0];
  };
  const [ap, an] = splitId(a);
  const [bp, bn] = splitId(b);
  const prefixCmp = ap.localeCompare(bp);
  return prefixCmp !== 0 ? prefixCmp : an - bn;
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") redirect("/admin/login");

  await applyPostCloseCategoryRules(getYear());

  const [regRows, teamRowsInitial, matchRows, playerRows, catRows, statusRows, adminRows, finalistKeys, rawGiveaways, tumblerOptionRows, mediaRows, communityMediaRows] = await Promise.all([
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
            gender: true,
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
        member1: { select: { fullNameEn: true, fullNameKo: true, gender: true, clubs: { select: { clubCode: true } } } },
        member2: { select: { fullNameEn: true, fullNameKo: true, gender: true, clubs: { select: { clubCode: true } } } },
      },
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }],
    }),
    prisma.match.findMany({
      include: {
        category: { select: { label: true, labelKo: true } },
        roundRef: { select: { code: true, labelEn: true, labelKo: true, sortOrder: true } },
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
    prisma.giveaway.findMany({
      include: { player: { select: { id: true, fullNameEn: true, fullNameKo: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tumblerOption.findMany({
      orderBy: { sortOrder: "asc" },
      select: { optionId: true, label: true, imageSrc: true, stock: true },
    }),
    prisma.media.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { date: "desc" }],
      select: {
        id: true,
        type: true,
        title: true,
        titleKo: true,
        subtitle: true,
        subtitleKo: true,
        image: true,
        media: true,
        outlet: true,
        outletKo: true,
        date: true,
        categoryId: true,
        sortOrder: true,
        tournamentYear: true,
      },
    }),
    prisma.communityMediaPost.findMany({
      orderBy: [{ isAwardWinner: "desc" }, { likeCount: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        nickname: true,
        imageUrl: true,
        createdAt: true,
        likeCount: true,
        viewCount: true,
        isAwardWinner: true,
        tournamentYear: true,
        _count: { select: { comments: true } },
        comments: { orderBy: { createdAt: "asc" } },
      },
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
    const affectedCats = new Set(staleTeams.map((t) => `${t.tournamentYear}|${t.categoryId}`));
    await Promise.all(staleTeams.map((team) =>
      prisma.team.delete({ where: { tournamentYear_id: { tournamentYear: team.tournamentYear, id: team.id } } })
    ));
    await Promise.all([...affectedCats].map((key) => {
      const [yearStr, catId] = key.split("|");
      return renumberTeamsInCategory(parseInt(yearStr, 10), catId!);
    }));
    teamRows = await prisma.team.findMany({
      include: {
        category: { select: { label: true, labelKo: true, isDoubles: true } },
        member1: { select: { fullNameEn: true, fullNameKo: true, gender: true, clubs: { select: { clubCode: true } } } },
        member2: { select: { fullNameEn: true, fullNameKo: true, gender: true, clubs: { select: { clubCode: true } } } },
      },
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }],
    });
  }

  // Auto-update prizes for years that have bracket rules (currently 2026)
  await Promise.all(Object.keys(PRIZE_BRACKETS).map(Number).flatMap((year) => {
    const teamCountMap = new Map<string, number>();
    for (const t of teamRows) {
      if (t.tournamentYear === year) teamCountMap.set(t.categoryId, (teamCountMap.get(t.categoryId) ?? 0) + 1);
    }
    return statusRows
      .filter((s) => s.tournamentYear === year && s.status === "Active")
      .flatMap((s) => {
        const cat = catRows.find((c) => c.id === s.categoryId);
        const amounts = getPrizeAmounts(teamCountMap.get(s.categoryId) ?? 0, year, cat?.isDoubles ?? false);
        if (!amounts) return [];
        return [prisma.categoryPrize.upsert({
          where: { tournamentYear_categoryId: { tournamentYear: year, categoryId: s.categoryId } },
          update: amounts,
          create: { tournamentYear: year, categoryId: s.categoryId, ...amounts },
        })];
      });
  }));

  const prizeRows = await prisma.categoryPrize.findMany({
    orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }],
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
    playerGender: r.player.gender,
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
    .map((t) => {
      const [m1, m2] = orderTeamMembersForDisplay(t.member1, t.member2);
      return {
        teamId: t.id,
        tournamentYear: t.tournamentYear,
        categoryId: t.categoryId,
        categoryLabel: t.category.label,
        categoryLabelKo: t.category.labelKo,
        isDoubles: t.category.isDoubles,
        seed: t.seed ?? null,
        member1NameEn: m1.fullNameEn.trim() || m1.fullNameKo?.trim() || "",
        member1NameKo: m1.fullNameKo?.trim() || null,
        member2NameEn: m2?.fullNameEn.trim() || m2?.fullNameKo?.trim() || null,
        member2NameKo: m2?.fullNameKo?.trim() || null,
      };
    })
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
  const teamClubMap = new Map<string, string[]>();
  for (const t of teamRows) {
    const [m1, m2] = orderTeamMembersForDisplay(t.member1, t.member2);
    teamMemberMap.set(`${t.tournamentYear}-${t.id}`, {
      namesEn: [
        m1.fullNameEn.trim() || m1.fullNameKo?.trim() || "",
        m2?.fullNameEn.trim() || m2?.fullNameKo?.trim() || null,
      ].filter(Boolean) as string[],
      namesKo: [
        m1.fullNameKo?.trim() || m1.fullNameEn.trim() || "",
        m2 ? (m2.fullNameKo?.trim() || m2.fullNameEn.trim() || null) : null,
      ].filter(Boolean) as string[],
    });
    teamClubMap.set(`${t.tournamentYear}-${t.id}`, [
      ...new Set([...t.member1.clubs, ...(t.member2?.clubs ?? [])].map((c) => c.clubCode)),
    ]);
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
    roundSortOrder: r.roundRef?.sortOrder ?? null,
    group: extractGroup(r.id),
    team1Id: r.team1Id,
    team2Id: r.team2Id,
    team1Names: t1?.namesEn ?? [],
    team1NamesKo: t1?.namesKo ?? [],
    team2Names: t2?.namesEn ?? [],
    team2NamesKo: t2?.namesKo ?? [],
    team1Clubs: r.team1Id ? teamClubMap.get(`${r.tournamentYear}-${r.team1Id}`) ?? [] : [],
    team2Clubs: r.team2Id ? teamClubMap.get(`${r.tournamentYear}-${r.team2Id}`) ?? [] : [],
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
    ballReceived: r.ballReceived,
    comment: r.comment,
    };
  }).sort((a, b) => {
    if (b.tournamentYear !== a.tournamentYear) return b.tournamentYear - a.tournamentYear;
    const rd = (a.roundSortOrder ?? 99) - (b.roundSortOrder ?? 99);
    if (rd !== 0) return rd;
    if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId);
    return naturalMatchIdSort(a.id, b.id);
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
    prelimFormat: s.prelimFormat ?? null,
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
    categoryId: p.categoryId,
    first: p.first,
    second: p.second,
    third: p.third,
    fourth: p.fourth,
  }));


  const giveaways = rawGiveaways.map((g) => ({
    id: g.id,
    tournamentYear: g.tournamentYear,
    playerId: g.player.id,
    playerNameEn: g.player.fullNameEn,
    playerNameKo: g.player.fullNameKo,
    optionId: g.optionId,
    optionId2: g.optionId2 ?? null,
    pickupClub: g.pickupClub,
    pickupNote: g.pickupNote,
    received: g.received,
    received2: g.received2,
    createdAt: g.createdAt.toISOString(),
  }));

  const tumblerOptions = tumblerOptionRows.map((o) => ({
    optionId: o.optionId,
    label: o.label,
    imageSrc: o.imageSrc ?? null,
    stock: o.stock,
  }));

  const mediaItems = mediaRows.map((m) => ({
    id: m.id,
    type: m.type,
    title: m.title,
    titleKo: m.titleKo,
    subtitle: m.subtitle,
    subtitleKo: m.subtitleKo,
    image: m.image,
    media: m.media,
    outlet: m.outlet,
    outletKo: m.outletKo,
    date: m.date ? m.date.toISOString() : null,
    categoryId: m.categoryId,
    sortOrder: m.sortOrder,
    tournamentYear: m.tournamentYear,
  }));

  const communityMediaPosts = communityMediaRows.map((p) => ({
    id: p.id,
    title: p.title,
    nickname: p.nickname,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt.toISOString(),
    likeCount: p.likeCount,
    viewCount: p.viewCount,
    isAwardWinner: p.isAwardWinner,
    tournamentYear: p.tournamentYear,
    commentCount: p._count.comments,
    comments: p.comments.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
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
      courtBookings={[]}
      giveaways={giveaways}
      tumblerOptions={tumblerOptions}
      drawsPublished={hasDrawPublishDatePassed()}
      mediaItems={mediaItems}
      communityMediaPosts={communityMediaPosts}
    />
  );
}
