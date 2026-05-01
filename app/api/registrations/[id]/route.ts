import { NextResponse } from "next/server";
import { parseClubCodesFromBody } from "@/lib/clubs";
import { prisma } from "@/lib/prisma";
import { normalizeNtrpForStorage } from "@/lib/ntrpFormat";
import {
  buildPlayerIdByPartnerNameMap,
  resolvePartnerIdFromPartnerName,
} from "@/lib/partnerLinking";

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
    console.error("resolveOrCreatePartnerId (admin edit): stub creation failed:", err);
    return null;
  }
}

async function setPlayerClubs(playerId: number, clubCodes: string[]) {
  await prisma.playerClub.deleteMany({ where: { playerId } });
  if (clubCodes.length === 0) return;
  await prisma.playerClub.createMany({
    data: clubCodes.map((clubCode) => ({ playerId, clubCode })),
  });
}

/** PATCH /api/registrations/[id] — update registration (admin). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const reg = await prisma.tournamentRegistration.findUnique({ where: { id }, include: { player: true } });
    if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

    if (body.fullNameEn != null || body.fullNameKo != null || body.email != null || body.phone != null || body.ntrp != null || body.clubs != null) {
      await prisma.player.update({
        where: { id: reg.playerId },
        data: {
          ...(typeof body.fullNameEn === "string" && { fullNameEn: body.fullNameEn.trim() }),
          ...(body.fullNameKo !== undefined && { fullNameKo: body.fullNameKo?.trim() || null }),
          ...(typeof body.email === "string" && { email: body.email.trim().toLowerCase() }),
          ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
          ...(body.ntrp !== undefined && { ntrp: normalizeNtrpForStorage(body.ntrp) }),
        },
      });
      if (body.clubs !== undefined) {
        await setPlayerClubs(reg.playerId, parseClubCodesFromBody(body.clubs));
      }
    }

    const partnerNames = body.partnerNames;
    const hasPartnerPayload =
      body.partnerNames !== undefined || body.partnerName !== undefined || body.categories !== undefined;

    const allCategoryIds = Array.from(new Set([
      reg.categoryId,
      ...(Array.isArray(body.categories) ? body.categories.filter((c: unknown): c is string => typeof c === "string") : []),
    ]));
    const categoryRows = await prisma.category.findMany({
      where: { id: { in: allCategoryIds } },
      select: { id: true, isDoubles: true },
    });
    const categoryIsDoubles = new Map(categoryRows.map((c) => [c.id, c.isDoubles]));

    let partnerNameForCategory: string | null | undefined;
    if (categoryIsDoubles.get(reg.categoryId) ?? false) {
      partnerNameForCategory =
        typeof partnerNames === "object" && partnerNames !== null && reg.categoryId in partnerNames
          ? String(partnerNames[reg.categoryId] ?? "").trim() || null
          : body.partnerName !== undefined
            ? (body.partnerName?.trim() || null)
            : undefined;
    } else if (hasPartnerPayload) {
      // Singles should never retain a partner link when editing category payload.
      partnerNameForCategory = null;
    }

    const hasCategoriesPayload = Array.isArray(body.categories);
    const requestedCategories: string[] = hasCategoriesPayload
      ? Array.from(
          new Set(
            body.categories.filter((c: unknown): c is string => typeof c === "string" && c.trim().length > 0)
          )
        )
      : [];

    const nextNotes = body.notes !== undefined ? (body.notes?.trim() || null) : undefined;
    const VALID_STATUSES = ["Pending", "Confirmed", "Refund Requested", "Refunded"] as const;
    let statusToSet: string | undefined;
    if (typeof body.status === "string" && VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])) {
      statusToSet = body.status;
    }

    const partnerIdByName =
      hasPartnerPayload || hasCategoriesPayload
        ? buildPlayerIdByPartnerNameMap(
            await prisma.player.findMany({
              select: { id: true, fullNameEn: true, fullNameKo: true },
            })
          )
        : new Map<string, number>();

    const partnerIdForPrimaryRow =
      partnerNameForCategory !== undefined
        ? await resolveOrCreatePartnerId(partnerNameForCategory, partnerIdByName, reg.playerId)
        : undefined;

    if (!hasCategoriesPayload) {
      await prisma.tournamentRegistration.update({
        where: { id },
        data: {
          ...(body.nameOnEtransfer !== undefined && { nameOnEtransfer: body.nameOnEtransfer?.trim() || null }),
          ...(partnerIdForPrimaryRow !== undefined && { partnerId: partnerIdForPrimaryRow }),
          ...(body.photoVideoConsent !== undefined && { photoVideoConsent: Boolean(body.photoVideoConsent) }),
          ...(body.engraving !== undefined && { engraving: body.engraving?.trim() || null }),
          ...(nextNotes !== undefined && { notes: nextNotes }),
          ...(statusToSet !== undefined && { status: statusToSet }),
        },
      });
      return NextResponse.json({ ok: true });
    }

    // Categories payload is provided: keep only selected categories for this edit flow.
    // Deselected current category should only remove this row.
    if (requestedCategories.length === 0) {
      await prisma.tournamentRegistration.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    for (const categoryId of requestedCategories) {
      if (categoryId === reg.categoryId) {
        await prisma.tournamentRegistration.update({
          where: { id },
          data: {
            ...(body.nameOnEtransfer !== undefined && { nameOnEtransfer: body.nameOnEtransfer?.trim() || null }),
            ...(partnerIdForPrimaryRow !== undefined && { partnerId: partnerIdForPrimaryRow }),
            ...(body.photoVideoConsent !== undefined && { photoVideoConsent: Boolean(body.photoVideoConsent) }),
            ...(body.engraving !== undefined && { engraving: body.engraving?.trim() || null }),
            ...(nextNotes !== undefined && { notes: nextNotes }),
            ...(statusToSet !== undefined && { status: statusToSet }),
          },
        });
        continue;
      }
      let partnerIdForUpsert: number | null;
      if (categoryIsDoubles.get(categoryId) ?? false) {
        if (typeof partnerNames === "object" && partnerNames !== null && categoryId in partnerNames) {
          const text = String(partnerNames[categoryId] ?? "").trim() || null;
          partnerIdForUpsert = await resolveOrCreatePartnerId(text, partnerIdByName, reg.playerId);
        } else if (body.partnerName !== undefined) {
          partnerIdForUpsert = await resolveOrCreatePartnerId(
            body.partnerName?.trim() || null,
            partnerIdByName,
            reg.playerId
          );
        } else {
          partnerIdForUpsert = null;
        }
      } else {
        partnerIdForUpsert = null;
      }
      await prisma.tournamentRegistration.upsert({
        where: {
          tournamentYear_playerId_categoryId: {
            tournamentYear: reg.tournamentYear,
            playerId: reg.playerId,
            categoryId,
          },
        },
        create: {
          tournamentYear: reg.tournamentYear,
          playerId: reg.playerId,
          categoryId,
          status: reg.status,
          nameOnEtransfer:
            body.nameOnEtransfer !== undefined ? body.nameOnEtransfer?.trim() || null : reg.nameOnEtransfer,
          partnerId: partnerIdForUpsert,
          photoVideoConsent:
            body.photoVideoConsent !== undefined ? Boolean(body.photoVideoConsent) : reg.photoVideoConsent,
          engraving: body.engraving !== undefined ? body.engraving?.trim() || null : reg.engraving,
          notes: nextNotes !== undefined ? nextNotes : reg.notes,
        },
        update: {
          ...(body.nameOnEtransfer !== undefined && { nameOnEtransfer: body.nameOnEtransfer?.trim() || null }),
          partnerId: partnerIdForUpsert,
          ...(body.photoVideoConsent !== undefined && { photoVideoConsent: Boolean(body.photoVideoConsent) }),
          ...(body.engraving !== undefined && { engraving: body.engraving?.trim() || null }),
          ...(nextNotes !== undefined && { notes: nextNotes }),
        },
      });
    }

    // Delete all registration rows for this player/year that are no longer selected,
    // including the current row if its category was deselected.
    await prisma.tournamentRegistration.deleteMany({
      where: {
        tournamentYear: reg.tournamentYear,
        playerId: reg.playerId,
        categoryId: { notIn: requestedCategories },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/registrations/[id]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/** DELETE /api/registrations/[id] — delete one registration row (admin). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.tournamentRegistration.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("DELETE /api/registrations/[id]", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
