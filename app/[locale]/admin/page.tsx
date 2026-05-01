import type { Locale } from "@/lib/content";
import { formatNtrpDisplay } from "@/lib/ntrpFormat";
import { prisma } from "@/lib/prisma";
import { getAvailableYears, getMatchesByYearBatch } from "@/lib/matches";
import { PageContainer } from "@/app/components/PageContainer";
import {
  getCategories,
  getCategoryParticipationForYear,
  getCategoryYearStatusList,
} from "@/lib/category/categories";
import { AdminHub } from "@/app/admin/AdminHub";
import type { YearData } from "@/app/admin/AdminHub";
import { AdminSignOut } from "./SignOut";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { SerializedRawReg } from "@/app/tables/registrationRows";

type Props = { params: Promise<{ locale: string }> };

const thisYear = new Date().getFullYear();

export default async function AdminPage({ params }: Props) {
const { locale: localeParam } = await params;
const locale: Locale = localeParam === "ko" ? "ko" : "en";
const localePrefix = `/${locale}`;
const session = await getServerSession(authOptions);

if (!session?.user?.email) {
  const callbackUrl = encodeURIComponent(`${localePrefix}/admin`);
  redirect(`${localePrefix}/admin/login?callbackUrl=${callbackUrl}`);
}

  const [categories, { allYears: fetchedYears }, allRawRegs] = await Promise.all([
    getCategories(),
    getAvailableYears(),
    prisma.tournamentRegistration.findMany({
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
            clubs: { select: { clubCode: true } },
          },
        },
        partner: {
          select: { fullNameEn: true, fullNameKo: true },
        },
      },
    }),
  ]);

  const categoryIds = categories.map((c) => c.id);
  const allYears = fetchedYears.includes(thisYear)
    ? fetchedYears
    : [thisYear, ...fetchedYears].sort((a, b) => b - a);

  const [
    matchesByYearBatch,
    participationByYearEntries,
    playersForAdmin,
    adminUsersRaw,
  ] = await Promise.all([
    getMatchesByYearBatch(allYears, categoryIds),
    Promise.all(allYears.map(async (y) => [y, await getCategoryParticipationForYear(y, categoryIds)] as const)),
    prisma.player.findMany({
      orderBy: { fullNameEn: "asc" },
      include: { clubs: { select: { clubCode: true } } },
    }),
    prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, active: true, createdAt: true },
    }),
  ]);

  const registrationsByYear = new Map<number, SerializedRawReg[]>();
  for (const reg of allRawRegs) {
    const list = registrationsByYear.get(reg.tournamentYear) ?? [];
    list.push({
      ...reg,
      createdAt: reg.createdAt.toISOString(),
      updatedAt: reg.updatedAt.toISOString(),
      player: {
        ...reg.player,
        clubs: reg.player.clubs.map((c) => c.clubCode),
      },
    });
    registrationsByYear.set(reg.tournamentYear, list);
  }

  const participationByYear = Object.fromEntries(participationByYearEntries);

  const statusesByYearEntries = await Promise.all(
    allYears.map(async (y) => [y, await getCategoryYearStatusList(y, categories, participationByYear[y])] as const)
  );
  const statusesByYear = Object.fromEntries(statusesByYearEntries);

  const yearDataByYear: Record<number, YearData> = {};
  for (const y of allYears) {
    const statusItems = statusesByYear[y] ?? [];
    const matchesByCat = matchesByYearBatch[y] ?? {};
    yearDataByYear[y] = {
      registrations: registrationsByYear.get(y) ?? [],
      matches: Object.values(matchesByCat).flat(),
      categoryStatusItems: statusItems,
      categoryStatusById: Object.fromEntries(statusItems.map((s) => [s.categoryId, s.status])),
      categoryParticipation: participationByYear[y] ?? {},
    };
  }

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
    active: u.active,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <PageContainer actions={<AdminSignOut />}>
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
