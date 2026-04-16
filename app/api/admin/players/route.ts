import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePlayerProfile } from "@/lib/ensurePlayerProfile";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/players — find or create Player by name; optionally link as partner on a registration.
 *
 * Body JSON:
 * - displayName (required): partner / roster name
 * - fullNameEn?, fullNameKo?, email? — optional overrides
 * - linkRegistrationId? — set TournamentRegistration.partnerId to this player (doubles only)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      displayName?: string;
      fullNameEn?: string | null;
      fullNameKo?: string | null;
      email?: string | null;
      linkRegistrationId?: string | null;
    };

    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (!displayName) {
      return NextResponse.json({ error: "displayName is required" }, { status: 400 });
    }

    const result = await ensurePlayerProfile({
      displayName,
      fullNameEn: body.fullNameEn,
      fullNameKo: body.fullNameKo,
      email: body.email,
    });

    if (body.linkRegistrationId?.trim()) {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: body.linkRegistrationId.trim() },
        select: { id: true, categoryId: true, partnerId: true, category: { select: { isDoubles: true } } },
      });
      if (!reg) {
        return NextResponse.json({ error: "Registration not found" }, { status: 404 });
      }
      if (!reg.category.isDoubles) {
        return NextResponse.json({ error: "Partner link only applies to doubles categories" }, { status: 400 });
      }
      if (reg.partnerId != null && reg.partnerId !== result.playerId) {
        return NextResponse.json(
          { error: "Registration already has a different partner linked" },
          { status: 409 }
        );
      }
      await prisma.tournamentRegistration.update({
        where: { id: reg.id },
        data: {
          partnerId: result.playerId,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      playerId: result.playerId,
      created: result.created,
      email: result.email,
    });
  } catch (e) {
    console.error("POST /api/admin/players", e);
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
