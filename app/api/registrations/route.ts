import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RegistrationStatus } from "@/lib/registrationStatus";
import { parseClubCodesFromBody } from "@/lib/clubCodeCanonical";
import { normalizeNtrpForStorage } from "@/lib/ntrpFormat";
import { getCategoryYearStatusDelegate } from "@/lib/categories";
import {
  buildPlayerIdByPartnerNameMap,
  resolvePartnerIdFromPartnerName,
} from "@/lib/partnerLinking";

const NEW_REGISTRATION_STATUS: RegistrationStatus = "Pending";

const DEFAULT_YEAR = new Date().getFullYear();

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
          ntrp: (normalizeNtrpForStorage(body.ntrp) || existing.ntrp) ?? undefined,
        },
      });
      await setPlayerClubs(playerId, clubCodes);
    } else {
      const existingByEmail = await prisma.player.findFirst({ where: { email } });
      if (existingByEmail) {
        playerId = existingByEmail.id;
        await prisma.player.update({
          where: { id: playerId },
          data: {
            fullNameEn: fullNameEn || existingByEmail.fullNameEn,
            fullNameKo: body.fullNameKo?.trim() || existingByEmail.fullNameKo,
            phone: (body.phone?.trim() || existingByEmail.phone) ?? undefined,
            ntrp: (normalizeNtrpForStorage(body.ntrp) || existingByEmail.ntrp) ?? undefined,
          },
        });
        await setPlayerClubs(playerId, clubCodes);
      } else {
        const player = await createPlayerRow({
          email,
          fullNameEn,
          fullNameKo: body.fullNameKo?.trim() || null,
          phone: body.phone?.trim() || null,
          ntrp: normalizeNtrpForStorage(body.ntrp),
        });
        playerId = player.id;
        await setPlayerClubs(playerId, clubCodes);
      }
    }

    const partnerNames = typeof body.partnerNames === "object" && body.partnerNames !== null ? body.partnerNames : {};
    const hasDoublesSelection = categoryRows.some((c) => c.isDoubles);
    const partnerIdByName = hasDoublesSelection
      ? buildPlayerIdByPartnerNameMap(
          await prisma.player.findMany({
            select: { id: true, fullNameEn: true, fullNameKo: true },
          })
        )
      : new Map<string, number>();

    /** Resolve partner by name, creating a stub player if not found. Best-effort: returns null on any failure. */
    async function resolveOrCreatePartnerId(
      partnerName: string | null,
      excludePlayerId: number
    ): Promise<{ id: number | null; stubError?: string }> {
      if (!partnerName?.trim()) return { id: null };
      const existing = resolvePartnerIdFromPartnerName(partnerName, partnerIdByName);
      if (existing != null && existing !== excludePlayerId) return { id: existing };
      // Partner not in DB — create a stub player so they can complete their profile later.
      try {
        const name = partnerName.trim();
        const stub = await createPlayerRow({
          fullNameEn: name,
          email: `partner-stub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@placeholder.tomlee-open`,
        });
        partnerIdByName.set(name.toLowerCase(), stub.id);
        return { id: stub.id };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("resolveOrCreatePartnerId: stub creation failed:", msg);
        return { id: null, stubError: msg };
      }
    }

    const created: { id: string; categoryId: string }[] = [];
    for (const categoryId of categories) {
      // 2026+ registrations should start as Pending at category level.
      if (tournamentYear >= 2026) {
        try {
          const cy = getCategoryYearStatusDelegate();
          await cy.upsert({
            where: { tournamentYear_categoryId: { tournamentYear, categoryId } },
            create: { tournamentYear, categoryId, status: "Pending" },
            update: {},
          });
        } catch (cyErr) {
          console.error("CategoryYearStatus upsert failed (non-fatal):", cyErr);
        }
      }
      const isDoubles = categoryIsDoubles.get(categoryId) ?? false;
      const partnerName = isDoubles
        ? partnerNames[categoryId]?.trim() || body.partnerName?.trim() || null
        : null;
      const partnerResult = isDoubles
        ? await resolveOrCreatePartnerId(partnerName, playerId)
        : { id: null };
      const resolvedPartnerId = partnerResult.id;
      if (partnerResult.stubError) {
        console.error(`[registration] stub creation error for "${partnerName}":`, partnerResult.stubError);
      }

      // Submitter is always `playerId`; partner is `resolvedPartnerId`. Do not reorder by numeric id
      // (that made the lower Player.id appear as the "main" registrant and swapped names in the UI).
      const registrationUpdateFields = {
        nameOnEtransfer: body.nameOnEtransfer?.trim() || undefined,
        photoVideoConsent: Boolean(body.photoVideoConsent),
        engraving: body.engraving?.trim() ?? undefined,
        notes: body.notes?.trim() ?? undefined,
      };

      let reg;
      if (
        resolvedPartnerId != null &&
        resolvedPartnerId !== playerId &&
        isDoubles
      ) {
        const existingPair = await prisma.tournamentRegistration.findFirst({
          where: {
            tournamentYear,
            categoryId,
            OR: [
              { playerId, partnerId: resolvedPartnerId },
              { playerId: resolvedPartnerId, partnerId: playerId },
            ],
          },
        });
        if (existingPair) {
          reg = await prisma.tournamentRegistration.update({
            where: { id: existingPair.id },
            data: {
              playerId,
              partnerId: resolvedPartnerId,
              status: NEW_REGISTRATION_STATUS,
              ...registrationUpdateFields,
            },
          });
          created.push({ id: reg.id, categoryId: reg.categoryId });
          continue;
        }
      }

      reg = await prisma.tournamentRegistration.upsert({
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
          status: NEW_REGISTRATION_STATUS,
          nameOnEtransfer: body.nameOnEtransfer?.trim() || null,
          partnerId: resolvedPartnerId,
          photoVideoConsent: Boolean(body.photoVideoConsent),
          engraving: body.engraving?.trim() || null,
          notes: body.notes?.trim() || null,
        },
        update: {
          ...registrationUpdateFields,
          partnerId: resolvedPartnerId ?? undefined,
        },
      });
      created.push({ id: reg.id, categoryId: reg.categoryId });
    }

    return NextResponse.json({ created });
  } catch (e) {
    console.error("POST /api/registrations", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Registration failed: ${msg}` }, { status: 500 });
  }
}
