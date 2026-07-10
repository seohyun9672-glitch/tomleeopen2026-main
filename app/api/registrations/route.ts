import { getYear } from "@/lib/utils";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RegistrationStatus } from "@/lib/registration";
import { parseClubCodesFromBody } from "@/lib/clubs";
import { createTeamFromRegistration, activateCategoryIfThresholdMet } from "@/lib/createTeam";
import { resolveOrCreatePartner } from "@/lib/resolvePartner";

const NEW_REGISTRATION_STATUS: RegistrationStatus = "Pending";

const DEFAULT_YEAR = getYear();


async function setPlayerClubs(playerId: number, clubCodes: string[]) {
  // Replace existing clubs with the submitted list.
  await prisma.playerClub.deleteMany({ where: { playerId } });
  if (clubCodes.length === 0) return;
  await prisma.playerClub.createMany({
    data: clubCodes.map((clubCode) => ({ playerId, clubCode })),
  });
}

/** Reject `0`, floats, and non-numeric `playerId` (e.g. `Number("") === 0` must not match an existing player). */
function parsePositiveIntPlayerId(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

function isPlayerIdPrimaryKeyViolation(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  const target = e.meta?.target;
  if (target === "id") return true;
  return Array.isArray(target) && target.includes("id");
}

/** When Postgres `Player_id_seq` lags behind `MAX(id)` (imports, manual fixes), the next insert can duplicate `id`. */
async function syncPostgresPlayerIdSequence(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT setval(
      pg_get_serial_sequence('"Player"', 'id'),
      COALESCE((SELECT MAX("id") FROM "Player"), 1)
    )`
  );
}

async function createPlayerRow(data: Prisma.PlayerCreateInput) {
  try {
    return await prisma.player.create({ data });
  } catch (e) {
    if (!isPlayerIdPrimaryKeyViolation(e)) throw e;
    await syncPostgresPlayerIdSequence();
    return prisma.player.create({ data });
  }
}

/** GET /api/registrations?year=&categoryId= — list all registrations (admin). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get("year");
    const categoryId = url.searchParams.get("categoryId");

    const rows = await prisma.tournamentRegistration.findMany({
      where: {
        ...(year ? { tournamentYear: parseInt(year, 10) } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        player: { select: { id: true, fullNameEn: true, fullNameKo: true } },
        partner: { select: { id: true, fullNameEn: true, fullNameKo: true } },
        category: { select: { label: true, labelKo: true, isDoubles: true } },
      },
      orderBy: [{ tournamentYear: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      rows.map((r) => ({
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
        partnerId: r.partner?.id ?? null,
        partnerNameEn: r.partner?.fullNameEn ?? null,
        partnerNameKo: r.partner?.fullNameKo ?? null,
        notes: r.notes,
        adminComments: r.adminComments,
        photoVideoConsent: r.photoVideoConsent,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    console.error("GET /api/registrations", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST /api/registrations — create registration(s) from public form. One per category. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tournamentYear = typeof body.tournamentYear === "number" ? body.tournamentYear : DEFAULT_YEAR;
    const categories: string[] = Array.isArray(body.categories)
      ? body.categories.filter((c: unknown): c is string => typeof c === "string")
      : [];
    if (categories.length === 0) {
      return NextResponse.json({ error: "At least one category is required" }, { status: 400 });
    }
    const fullNameEn = typeof body.fullNameEn === "string" ? body.fullNameEn.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!fullNameEn || !email) {
      return NextResponse.json({ error: "Full name and email are required" }, { status: 400 });
    }

    const clubCodes = parseClubCodesFromBody(body.clubs);

    const categoryRows = await prisma.category.findMany({
      where: { id: { in: categories } },
      select: { id: true, label: true, isDoubles: true },
    });
    const categoryIsDoubles = new Map(categoryRows.map((c) => [c.id, c.isDoubles]));
    const labelById = new Map(categoryRows.map((c) => [c.id, c.label]));

    let playerId: number;
    const requestedPlayerId = parsePositiveIntPlayerId(body.playerId);
    if (requestedPlayerId != null) {
      const existing = await prisma.player.findUnique({ where: { id: requestedPlayerId } });
      if (!existing) return NextResponse.json({ error: "Player not found" }, { status: 400 });
      playerId = existing.id;
      await prisma.player.update({
        where: { id: playerId },
        data: {
          fullNameEn: fullNameEn || existing.fullNameEn,
          fullNameKo: body.fullNameKo?.trim() || existing.fullNameKo,
          email: email || existing.email,
          phone: (body.phone?.trim() || existing.phone) ?? undefined,
          ntrp: (body.ntrp?.trim() || null || existing.ntrp) ?? undefined,
        },
      });
      await setPlayerClubs(playerId, clubCodes);
    } else {
      const phone = body.phone?.trim() || null;
      const fullNameKo = body.fullNameKo?.trim() || null;

      // Match by name+phone first — catches players who re-register with a new email
      const existingByNameAndPhone = phone
        ? await prisma.player.findFirst({
            where: {
              phone,
              OR: [
                { fullNameEn: { equals: fullNameEn, mode: "insensitive" as Prisma.QueryMode } },
                ...(fullNameKo
                  ? [{ fullNameKo: { equals: fullNameKo, mode: "insensitive" as Prisma.QueryMode } }]
                  : []),
              ],
            },
          })
        : null;

      const existingByEmail = existingByNameAndPhone
        ? null
        : await prisma.player.findFirst({ where: { email } });

      const existingPlayer = existingByNameAndPhone ?? existingByEmail;

      if (existingPlayer) {
        playerId = existingPlayer.id;
        await prisma.player.update({
          where: { id: playerId },
          data: { email, fullNameEn, fullNameKo, phone, ntrp: body.ntrp?.trim() || null },
        });
        await setPlayerClubs(playerId, clubCodes);
      } else {
        const player = await createPlayerRow({
          email,
          fullNameEn,
          fullNameKo,
          phone,
          ntrp: body.ntrp?.trim() || null,
        });
        playerId = player.id;
        await setPlayerClubs(playerId, clubCodes);
      }
    }

    const partnerNames = typeof body.partnerNames === "object" && body.partnerNames !== null ? body.partnerNames : {};
    const partnerIdsFromBody: Record<string, number> =
      typeof body.partnerIds === "object" && body.partnerIds !== null ? body.partnerIds : {};

    const created: { id: string; categoryId: string }[] = [];
    for (const categoryId of categories) {
      // 2026+ registrations should start as Pending at category level.
      if (tournamentYear >= 2026) {
        try {
          await prisma.categoryYearStatus.upsert({
            where: { tournamentYear_categoryId: { tournamentYear, categoryId } },
            create: { tournamentYear, categoryId, status: "Pending" },
            update: {},
          });
        } catch (cyErr) {
          console.error("CategoryYearStatus upsert failed (non-fatal):", cyErr);
        }
      }
      const isDoubles = categoryIsDoubles.get(categoryId) ?? false;
      let resolvedPartnerId: number | null = null;
      if (isDoubles) {
        if (partnerIdsFromBody[categoryId] != null) {
          resolvedPartnerId = partnerIdsFromBody[categoryId];
        } else {
          const partnerName = partnerNames[categoryId]?.trim() || body.partnerName?.trim() || null;
          resolvedPartnerId = await resolveOrCreatePartner(partnerName, playerId);
        }
      }

      // Submitter is always `playerId`; partner is `resolvedPartnerId`. Do not reorder by numeric id
      // (that made the lower Player.id appear as the "main" registrant and swapped names in the UI).
      const paymentReceived = Boolean(body.paymentReceived);

      // Status defaults to Pending; Inactive category forces Cancelled
      const catStatus = await prisma.categoryYearStatus.findFirst({
        where: { tournamentYear, categoryId },
        select: { status: true },
      });
      const registrationStatus: RegistrationStatus =
        catStatus?.status === "Inactive" ? "Cancelled" : NEW_REGISTRATION_STATUS;

      const registrationUpdateFields = {
        nameOnEtransfer: body.nameOnEtransfer?.trim() || undefined,
        photoVideoConsent: Boolean(body.photoVideoConsent),
        paymentReceived,
        notes: body.notes?.trim() ?? undefined,
      };

      const reg = await prisma.tournamentRegistration.upsert({
        where: {
          tournamentYear_playerId_categoryId: {
            tournamentYear,
            playerId,
            categoryId,
          },
        },
        create: {
          tournamentYear,
          playerId,
          categoryId,
          status: registrationStatus,
          nameOnEtransfer: body.nameOnEtransfer?.trim() || null,
          partnerId: resolvedPartnerId,
          photoVideoConsent: Boolean(body.photoVideoConsent),
          paymentReceived,
          notes: body.notes?.trim() || null,
        },
        update: {
          ...registrationUpdateFields,
          partnerId: resolvedPartnerId ?? undefined,
        },
      });

      await createTeamFromRegistration({
        tournamentYear,
        categoryId,
        playerId,
        partnerId: resolvedPartnerId,
      });

      await activateCategoryIfThresholdMet(tournamentYear, categoryId);

      created.push({ id: reg.id, categoryId: reg.categoryId });
    }

    return NextResponse.json({ created });
  } catch (e) {
    console.error("POST /api/registrations", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Registration failed: ${msg}` }, { status: 500 });
  }
}
