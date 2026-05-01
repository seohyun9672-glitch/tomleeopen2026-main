import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseClubCodesFromBody } from "@/lib/clubs";
import { normalizeNtrpForStorage } from "@/lib/ntrpFormat";
import {
  buildPlayerIdByPartnerNameMap,
  resolvePartnerIdFromPartnerName,
} from "@/lib/partnerLinking";

async function setPlayerClubs(playerId: number, clubCodes: string[]) {
  await prisma.playerClub.deleteMany({ where: { playerId } });
  if (clubCodes.length === 0) return;
  await prisma.playerClub.createMany({
    data: clubCodes.map((clubCode) => ({ playerId, clubCode })),
  });
}

async function resolveOrCreatePartnerId(
  text: string | null,
  partnerIdByName: Map<string, number>,
  excludePlayerId: number
): Promise<number | null> {
  if (!text?.trim()) return null;
  const name = text.trim();
  const existing = resolvePartnerIdFromPartnerName(name, partnerIdByName);
  if (existing != null && existing !== excludePlayerId) return existing;
  try {
    const stub = await prisma.player.create({
      data: {
        fullNameEn: name,
        email: `partner-stub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@placeholder.tomlee-open`,
      },
    });
    partnerIdByName.set(name.toLowerCase(), stub.id);
    return stub.id;
  } catch (err) {
    console.error("resolveOrCreatePartnerId (self): stub creation failed:", err);
    return null;
  }
}

/**
 * PATCH /api/registrations/self — public player self-edit.
 *
 * Verified by email (no session auth). Applies the following diff against current registrations:
 * - Removed categories → status set to "Refund Requested"
 * - Kept categories → update personal/tournament details
 * - New categories → create new Confirmed registrations
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const year =
      typeof body.year === "number" && Number.isFinite(body.year)
        ? body.year
        : new Date().getFullYear();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const player = await prisma.player.findFirst({ where: { email } });
    if (!player) {
      return NextResponse.json({ error: "No player found for this email" }, { status: 404 });
    }

    // Update player record
    await prisma.player.update({
      where: { id: player.id },
      data: {
        ...(typeof body.fullNameEn === "string" && body.fullNameEn.trim() && {
          fullNameEn: body.fullNameEn.trim(),
        }),
        ...(body.fullNameKo !== undefined && { fullNameKo: body.fullNameKo?.trim() || null }),
        ...(typeof body.phone === "string" && { phone: body.phone.trim() || null }),
        ...(body.ntrp !== undefined && { ntrp: normalizeNtrpForStorage(body.ntrp) }),
      },
    });

    if (Array.isArray(body.clubs)) {
      await setPlayerClubs(player.id, parseClubCodesFromBody(body.clubs));
    }

    const requestedCategories: string[] = Array.isArray(body.categories)
      ? body.categories.filter((c: unknown): c is string => typeof c === "string" && c.trim().length > 0)
      : [];

    // Fetch current registrations (excluding already-refunded/cancelled)
    const currentRegs = await prisma.tournamentRegistration.findMany({
      where: {
        playerId: player.id,
        tournamentYear: year,
        status: { notIn: ["Refund Requested", "Cancelled"] },
      },
    });

    const currentCategoryIds = currentRegs.map((r) => r.categoryId);

    if (requestedCategories.length === 0) {
      // Full refund — mark all non-refunded registrations as "Refund Requested"
      if (currentCategoryIds.length > 0) {
        await prisma.tournamentRegistration.updateMany({
          where: { playerId: player.id, tournamentYear: year, categoryId: { in: currentCategoryIds } },
          data: { status: "Refund Requested" },
        });
      }
      return NextResponse.json({ ok: true });
    }

    const removedCategoryIds = currentCategoryIds.filter((c) => !requestedCategories.includes(c));
    const newCategoryIds = requestedCategories.filter((c) => !currentCategoryIds.includes(c));
    const keptCategoryIds = requestedCategories.filter((c) => currentCategoryIds.includes(c));

    // Each new addition offsets one removal (payment transfers). Only excess removals need a refund.
    const cancelledCategoryIds = removedCategoryIds.slice(0, newCategoryIds.length);
    const refundCategoryIds = removedCategoryIds.slice(newCategoryIds.length);

    // Swapped-out registrations are deleted — no record needed since payment transfers to the new category.
    if (cancelledCategoryIds.length > 0) {
      await prisma.tournamentRegistration.deleteMany({
        where: {
          playerId: player.id,
          tournamentYear: year,
          categoryId: { in: cancelledCategoryIds },
        },
      });
    }

    if (refundCategoryIds.length > 0) {
      await prisma.tournamentRegistration.updateMany({
        where: {
          playerId: player.id,
          tournamentYear: year,
          categoryId: { in: refundCategoryIds },
        },
        data: { status: "Refund Requested" },
      });
    }

    // Resolve partner names for doubles categories
    const allCategoryIds = [...new Set([...keptCategoryIds, ...newCategoryIds])];
    const categoryRows = await prisma.category.findMany({
      where: { id: { in: allCategoryIds } },
      select: { id: true, isDoubles: true },
    });
    const categoryIsDoubles = new Map(categoryRows.map((c) => [c.id, c.isDoubles]));

    const partnerNames: Record<string, string> =
      typeof body.partnerNames === "object" && body.partnerNames !== null ? body.partnerNames : {};

    const hasDoublesChanges = allCategoryIds.some((id) => categoryIsDoubles.get(id) ?? false);
    const partnerIdByName = hasDoublesChanges
      ? buildPlayerIdByPartnerNameMap(
          await prisma.player.findMany({
            select: { id: true, fullNameEn: true, fullNameKo: true },
          })
        )
      : new Map<string, number>();

    const sharedUpdateFields = {
      ...(body.nameOnEtransfer !== undefined && {
        nameOnEtransfer: body.nameOnEtransfer?.trim() || null,
      }),
      ...(body.photoVideoConsent !== undefined && {
        photoVideoConsent: Boolean(body.photoVideoConsent),
      }),
      ...(body.engraving !== undefined && { engraving: body.engraving?.trim() || null }),
    };

    // Update kept registrations
    for (const categoryId of keptCategoryIds) {
      let partnerId: number | null | undefined = undefined;
      if ((categoryIsDoubles.get(categoryId) ?? false) && categoryId in partnerNames) {
        partnerId = await resolveOrCreatePartnerId(
          partnerNames[categoryId] || null,
          partnerIdByName,
          player.id
        );
      }

      await prisma.tournamentRegistration.updateMany({
        where: { playerId: player.id, tournamentYear: year, categoryId },
        data: {
          ...sharedUpdateFields,
          ...(partnerId !== undefined && { partnerId }),
        },
      });
    }

    // Create new registrations
    for (const categoryId of newCategoryIds) {
      const isDoubles = categoryIsDoubles.get(categoryId) ?? false;
      const partnerId =
        isDoubles && partnerNames[categoryId]
          ? await resolveOrCreatePartnerId(partnerNames[categoryId], partnerIdByName, player.id)
          : null;

      await prisma.tournamentRegistration.upsert({
        where: {
          tournamentYear_playerId_categoryId: {
            tournamentYear: year,
            playerId: player.id,
            categoryId,
          },
        },
        create: {
          tournamentYear: year,
          playerId: player.id,
          categoryId,
          status: "Pending",
          nameOnEtransfer: body.nameOnEtransfer?.trim() || null,
          partnerId,
          photoVideoConsent: Boolean(body.photoVideoConsent),
          engraving: body.engraving?.trim() || null,
        },
        update: {
          status: "Pending",
          ...sharedUpdateFields,
          partnerId,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/registrations/self", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
