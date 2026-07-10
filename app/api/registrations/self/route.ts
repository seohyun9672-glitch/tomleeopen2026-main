import { getYear } from "@/lib/utils";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseClubCodesFromBody } from "@/lib/clubs";
import { createTeamFromRegistration, activateCategoryIfThresholdMet } from "@/lib/createTeam";
import { resolveOrCreatePartner } from "@/lib/resolvePartner";

async function setPlayerClubs(playerId: number, clubCodes: string[]) {
  await prisma.playerClub.deleteMany({ where: { playerId } });
  if (clubCodes.length === 0) return;
  await prisma.playerClub.createMany({
    data: clubCodes.map((clubCode) => ({ playerId, clubCode })),
  });
}


/**
 * PATCH /api/registrations/self — public player self-edit.
 *
 * Verified by email (no session auth). Applies the following diff against current registrations:
 * - Removed categories → registration record deleted
 * - Kept categories → update personal/tournament details
 * - New categories → create new Pending registrations
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const year =
      typeof body.year === "number" && Number.isFinite(body.year)
        ? body.year
        : getYear();

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
        ...(body.ntrp !== undefined && { ntrp: body.ntrp?.trim() || null }),
      },
    });

    if (Array.isArray(body.clubs)) {
      await setPlayerClubs(player.id, parseClubCodesFromBody(body.clubs));
    }

    const requestedCategories: string[] = Array.isArray(body.categories)
      ? body.categories.filter((c: unknown): c is string => typeof c === "string" && c.trim().length > 0)
      : [];

    // Fetch current active registrations (excluding cancelled)
    const currentRegs = await prisma.tournamentRegistration.findMany({
      where: {
        playerId: player.id,
        tournamentYear: year,
        status: { not: "Cancelled" },
      },
    });

    const currentCategoryIds = currentRegs.map((r) => r.categoryId);

    const removedCategoryIds = currentCategoryIds.filter((c) => !requestedCategories.includes(c));
    const newCategoryIds = requestedCategories.filter((c) => !currentCategoryIds.includes(c));
    const keptCategoryIds = requestedCategories.filter((c) => currentCategoryIds.includes(c));

    // Delete removed registrations
    if (removedCategoryIds.length > 0) {
      await prisma.tournamentRegistration.deleteMany({
        where: {
          playerId: player.id,
          tournamentYear: year,
          categoryId: { in: removedCategoryIds },
        },
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
    const partnerIds: Record<string, number> =
      typeof body.partnerIds === "object" && body.partnerIds !== null ? body.partnerIds : {};

    const sharedUpdateFields = {
      ...(body.nameOnEtransfer !== undefined && {
        nameOnEtransfer: body.nameOnEtransfer?.trim() || null,
      }),
      ...(body.photoVideoConsent !== undefined && {
        photoVideoConsent: Boolean(body.photoVideoConsent),
      }),
      ...(body.notes !== undefined && {
        notes: body.notes?.trim() || null,
      }),
    };

    // Update kept registrations
    for (const categoryId of keptCategoryIds) {
      let partnerId: number | null | undefined = undefined;
      if (categoryIsDoubles.get(categoryId) ?? false) {
        if (partnerIds[categoryId] != null) {
          partnerId = partnerIds[categoryId];
        } else if (categoryId in partnerNames) {
          partnerId = await resolveOrCreatePartner(
            partnerNames[categoryId] || null,
            player.id
          );
        }
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
      let partnerId: number | null = null;
      if (isDoubles) {
        if (partnerIds[categoryId] != null) {
          partnerId = partnerIds[categoryId];
        } else if (partnerNames[categoryId]) {
          partnerId = await resolveOrCreatePartner(partnerNames[categoryId], player.id);
        }
      }

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
          notes: body.notes?.trim() || null,
        },
        update: {
          status: "Pending",
          ...sharedUpdateFields,
          partnerId,
        },
      });

      await createTeamFromRegistration({
        tournamentYear: year,
        categoryId,
        playerId: player.id,
        partnerId,
      });

      await activateCategoryIfThresholdMet(year, categoryId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/registrations/self", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
