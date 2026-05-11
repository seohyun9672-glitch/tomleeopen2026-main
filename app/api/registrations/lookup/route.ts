import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


/** GET /api/registrations/lookup?email=...&year=... — public registration lookup by email. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim().toLowerCase();
    const yearParam = url.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const player = await prisma.player.findFirst({
      where: { email },
      include: { clubs: { select: { clubCode: true } } },
    });

    if (!player) {
      return NextResponse.json({ error: "No registration found for this email" }, { status: 404 });
    }

    const registrations = await prisma.tournamentRegistration.findMany({
      where: { playerId: player.id, tournamentYear: year },
      include: {
        partner: { select: { fullNameEn: true, fullNameKo: true } },
      },
    });

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "No registration found for this email and year" },
        { status: 404 }
      );
    }

    // Build per-category partner name map
    const partnerNames: Record<string, string> = {};
    for (const reg of registrations) {
      if (reg.partner) {
        const name = reg.partner.fullNameEn?.trim() || reg.partner.fullNameKo?.trim() || "";
        if (name) partnerNames[reg.categoryId] = name;
      }
    }

    return NextResponse.json({
      playerId: player.id,
      fullNameEn: player.fullNameEn,
      fullNameKo: player.fullNameKo,
      email: player.email,
      phone: player.phone,
      ntrp: player.ntrp ?? null,
      clubs: player.clubs.map((c) => c.clubCode),
      year,
      registrations: registrations.map((r) => ({
        id: r.id,
        categoryId: r.categoryId,
        status: r.status,
        photoVideoConsent: r.photoVideoConsent,
        engraving: r.engraving,
        nameOnEtransfer: r.nameOnEtransfer,
        notes: r.notes,
      })),
      partnerNames,
    });
  } catch (e) {
    console.error("GET /api/registrations/lookup", e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
