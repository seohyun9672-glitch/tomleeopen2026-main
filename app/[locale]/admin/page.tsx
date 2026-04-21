import type { Locale } from "@/lib/content";
import { formatNtrpDisplay } from "@/lib/ntrpFormat";
import { siteContent } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { getAvailableYears, getMatchesByYearBatch } from "@/lib/matches";
import { PageContainer } from "@/app/components/PageContainer";
import {
  getCategories,
  getCategoryParticipationForYear,
  getCategoryYearStatusList,
} from "@/lib/cateogry/categories";
import { AdminHub } from "@/app/admin/AdminHub";
import type { YearData } from "@/app/admin/AdminHub";
import { AdminSignOut } from "@/app/admin/login/AdminSignOut";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

const thisYear = new Date().getFullYear();

export default async function AdminPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const localePrefix = locale === "ko" ? "/ko" : "";

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    const callbackUrl = encodeURIComponent(`${localePrefix}/admin`);
    redirect(`${localePrefix}/admin/login?callbackUrl=${callbackUrl}`);
  }

  const content = siteContent[locale];

  const categories = await getCategories();
  const categoryIds = categories.map((c) => c.id);
  const categoryIsDoubles = new Map(categories.map((c) => [c.id, c.isDoubles]));

  // Gather available years for the year filter
  const { allYears: fetchedYears } = await getAvailableYears();
  const allYears = fetchedYears.includes(thisYear)
    ? fetchedYears
    : [thisYear, ...fetchedYears].sort((a, b) => b - a);

  // Fetch registrations for all years
  const allRawRegs = await prisma.tournamentRegistration.findMany({
    orderBy: [{ tournamentYear: "desc" }, { createdAt: "desc" }],
    include: {
      player: {
        select: {
          id: true,
          fullNameEn: true,
          fullNameKo: true,
          email: true,
          phone: true,
          ntrp: true,
        },
      },
      partner: {
        select: { fullNameEn: true, fullNameKo: true },
      },
    },
  });

  // Clubs for all registered players
  const allPlayerIds = [...new Set(allRawRegs.map((r) => r.playerId))];
  const clubRows =
    allPlayerIds.length > 0
      ? await prisma.playerClub.findMany({
          where: { playerId: { in: allPlayerIds } },
          select: { playerId: true, clubCode: true },
        })
      : [];
  const clubsByPlayerId = new Map<number, string[]>();
  for (const row of clubRows) {
    const list = clubsByPlayerId.get(row.playerId) ?? [];
    if (!list.includes(row.clubCode)) list.push(row.clubCode);
    clubsByPlayerId.set(row.playerId, list);
  }

  // Group raw registrations by year
  const rawRegsByYear = new Map<number, RawReg[]>();
  for (const reg of allRawRegs) {
    const list = rawRegsByYear.get(reg.tournamentYear) ?? [];
    list.push(reg);
    rawRegsByYear.set(reg.tournamentYear, list);
  }

  // Fetch matches, category statuses, and participation for all years in parallel
  const [matchesByYearBatch, statusesByYearEntries, participationByYearEntries] = await Promise.all([
    getMatchesByYearBatch(allYears, categoryIds),
    Promise.all(allYears.map(async (y) => [y, await getCategoryYearStatusList(y)] as const)),
    Promise.all(allYears.map(async (y) => [y, await getCategoryParticipationForYear(y, categoryIds)] as const)),
  ]);

  const statusesByYear = Object.fromEntries(statusesByYearEntries);
  const participationByYear = Object.fromEntries(participationByYearEntries);

  const yearDataByYear: Record<number, YearData> = {};
  for (const y of allYears) {
    const statusItems = statusesByYear[y] ?? [];
    const matchesByCat = matchesByYearBatch[y] ?? {};
    yearDataByYear[y] = {
      registrations: buildRegistrationRows(rawRegsByYear.get(y) ?? [], clubsByPlayerId, categoryIsDoubles),
      matches: Object.values(matchesByCat).flat(),
      categoryStatusItems: statusItems,
      categoryStatusById: Object.fromEntries(statusItems.map((s) => [s.categoryId, s.status])),
      categoryParticipation: participationByYear[y] ?? {},
    };
  }

  // Players and admin users are not year-dependent
  const [playersForAdmin, adminUsersRaw] = await Promise.all([
    prisma.player.findMany({
      orderBy: { fullNameEn: "asc" },
      include: { clubs: { select: { clubCode: true } } },
    }),
    prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, createdAt: true },
    }),
  ]);

  const players = playersForAdmin.map((p) => ({
    id: p.id,
    fullNameEn: p.fullNameEn,
    fullNameKo: p.fullNameKo,
    email: p.email,
    phone: p.phone,
    ntrp: p.ntrp != null ? formatNtrpDisplay(p.ntrp) : null,
    clubs: p.clubs.map((c) => c.clubCode).sort(),
  }));

  const adminUsers = adminUsersRaw.map((u) => ({
    id: u.id,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <PageContainer
      title={content.adminPage.heroTitle}
      actions={<AdminSignOut label={content.shared.buttons.signOut} />}
    >
      <AdminHub
        yearDataByYear={yearDataByYear}
        allYears={allYears}
        categories={categories}
        players={players}
        adminUsers={adminUsers}
      />
    </PageContainer>
  );
}

type RawReg = {
  id: string;
  playerId: number;
  partnerId: number | null;
  tournamentYear: number;
  categoryId: string;
  status: string;
  nameOnEtransfer: string | null;
  photoVideoConsent: boolean;
  engraving: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  player: { id: number; fullNameEn: string; fullNameKo: string | null; email: string; phone: string | null; ntrp: string | null };
  partner: { fullNameEn: string; fullNameKo: string | null } | null;
};

function buildRegistrationRows(
  rawRegs: RawReg[],
  clubsByPlayerId: Map<number, string[]>,
  categoryIsDoubles: Map<string, boolean>
) {
  // Deduplicate doubles pairs (show one row per pair)
  const deduped: RawReg[] = [];
  const seenPairKeys = new Set<string>();
  for (const reg of rawRegs) {
    if (!(categoryIsDoubles.get(reg.categoryId) ?? false)) {
      deduped.push(reg);
      continue;
    }
    const resolvedPartnerId = reg.partnerId ?? null;
    if (!resolvedPartnerId || resolvedPartnerId === reg.playerId) {
      deduped.push(reg);
      continue;
    }
    const a = Math.min(reg.playerId, resolvedPartnerId);
    const b = Math.max(reg.playerId, resolvedPartnerId);
    const pairKey = `${reg.tournamentYear}:${reg.categoryId}:${a}:${b}`;
    if (seenPairKeys.has(pairKey)) continue;
    seenPairKeys.add(pairKey);
    deduped.push(reg);
  }

  // Registration numbers: sorted by createdAt ascending
  const regNumberById = new Map<string, number>();
  [...rawRegs]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((r, i) => regNumberById.set(r.id, i + 1));

  // Group regs by player to show partner names across all their categories
  const regsByPlayer = new Map<number, RawReg[]>();
  for (const reg of rawRegs) {
    const list = regsByPlayer.get(reg.playerId) ?? [];
    list.push(reg);
    regsByPlayer.set(reg.playerId, list);
  }

  return deduped.map((r) => {
    const groupedRegs = regsByPlayer.get(r.playerId) ?? [r];
    const allCategoryIds = groupedRegs.map((gr) => gr.categoryId);
    const partnerNameByCategory: Record<string, string> = {};
    for (const gr of groupedRegs) {
      const linkedEn = gr.partner?.fullNameEn?.trim();
      const linkedKo = gr.partner?.fullNameKo?.trim();
      const partnerDisplay = linkedEn ?? linkedKo ?? "";
      if (partnerDisplay) partnerNameByCategory[gr.categoryId] = partnerDisplay;
    }
    const linkedEn = r.partner?.fullNameEn?.trim() ?? null;
    const linkedKo = r.partner?.fullNameKo?.trim() ?? null;
    return {
      id: r.id,
      playerId: r.playerId,
      registrationNumber: regNumberById.get(r.id) ?? null,
      tournamentYear: r.tournamentYear,
      fullNameEn: r.player.fullNameEn,
      fullNameKo: r.player.fullNameKo,
      email: r.player.email,
      phone: r.player.phone,
      ntrp: r.player.ntrp != null ? formatNtrpDisplay(r.player.ntrp) : null,
      partnerNameEn: linkedEn ?? null,
      partnerNameKo: linkedKo ?? null,
      clubs: JSON.stringify(clubsByPlayerId.get(r.playerId) ?? []),
      category: r.categoryId,
      categories: JSON.stringify(allCategoryIds),
      partnerId: r.partnerId,
      partnerNames:
        Object.keys(partnerNameByCategory).length > 0
          ? JSON.stringify(partnerNameByCategory)
          : null,
      nameOnEtransfer: r.nameOnEtransfer,
      photoVideoConsent: r.photoVideoConsent,
      engraving: r.engraving,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}
