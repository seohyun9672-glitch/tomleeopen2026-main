import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getOptionsWithCounts(tournamentYear: number) {
  const [options, counts, counts2] = await Promise.all([
    prisma.tumblerOption.findMany({
      where: { tournamentYear },
      orderBy: { sortOrder: "asc" },
      select: { optionId: true, label: true, imageSrc: true, status: true, stock: true, ml: true, colour: true, colourKo: true },
    }),
    prisma.giveaway.groupBy({
      by: ["optionId"],
      where: { tournamentYear },
      _count: { optionId: true },
    }),
    prisma.giveaway.groupBy({
      by: ["optionId2"],
      where: { tournamentYear, optionId2: { not: null } },
      _count: { optionId2: true },
    }),
  ]);

  const countMap = new Map<string, number>();
  for (const c of counts) countMap.set(c.optionId, (countMap.get(c.optionId) ?? 0) + c._count.optionId);
  for (const c of counts2) {
    if (c.optionId2) countMap.set(c.optionId2, (countMap.get(c.optionId2) ?? 0) + c._count.optionId2);
  }

  return options.map((opt) => ({ ...opt, count: countMap.get(opt.optionId) ?? 0 }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year } = await params;
  const tournamentYear = Number(year);
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() ?? null;
  const playerIdParam = Number(searchParams.get("playerId")) || null;

  try {
    // Resolve player from email or playerId
    let player: { id: number; fullNameEn: string; fullNameKo: string | null; email: string } | null = null;
    if (email) {
      const players = await prisma.player.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, fullNameEn: true, fullNameKo: true, email: true },
      });
      if (players.length === 0) {
        return NextResponse.json({ error: "No player found with that email." }, { status: 404 });
      }
      if (players.length > 1) {
        // Filter to only players with a confirmed registration for this year
        const confirmedIds = new Set(
          (await prisma.tournamentRegistration.findMany({
            where: { playerId: { in: players.map((p) => p.id) }, tournamentYear, status: "Confirmed" },
            select: { playerId: true },
          })).map((r) => r.playerId)
        );
        const eligible = players.filter((p) => confirmedIds.has(p.id));
        if (eligible.length === 0) {
          return NextResponse.json({ error: "No registration found for this player." }, { status: 403 });
        }
        if (eligible.length === 1) {
          player = eligible[0];
        } else {
          return NextResponse.json({
            multipleFound: true,
            players: eligible.map((p) => ({ id: p.id, fullNameEn: p.fullNameEn, fullNameKo: p.fullNameKo })),
          });
        }
      } else {
        player = players[0];
      }
    } else if (playerIdParam) {
      player = await prisma.player.findUnique({
        where: { id: playerIdParam },
        select: { id: true, fullNameEn: true, fullNameKo: true, email: true },
      });
    }

    const isAdmin = player?.email
      ? (await prisma.adminUser.count({ where: { email: player.email, active: true } })) > 0
      : false;

    // Validate registration for non-admins; also track it for admins (determines second tumbler eligibility)
    let hasRegistration = false;
    if (player) {
      const registration = await prisma.tournamentRegistration.findFirst({
        where: { playerId: player.id, tournamentYear, status: "Confirmed" },
      });
      hasRegistration = registration != null;
      if (!isAdmin && !hasRegistration) {
        return NextResponse.json({ error: "No registration found for this player." }, { status: 403 });
      }
    }

    const [giveawayChoice, options] = await Promise.all([
      player
        ? prisma.giveaway.findFirst({
            where: { tournamentYear, playerId: player.id },
            select: { id: true, optionId: true, optionId2: true, pickupClub: true, pickupNote: true },
          })
        : Promise.resolve(null),
      getOptionsWithCounts(tournamentYear),
    ]);

    return NextResponse.json({
      player: player ? { id: player.id, fullNameEn: player.fullNameEn, fullNameKo: player.fullNameKo, email: player.email } : null,
      isAdmin,
      hasRegistration,
      options,
      choice: giveawayChoice ?? null,
    });
  } catch (e) {
    console.error("GET /api/giveaway/[year]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year } = await params;
  const tournamentYear = Number(year);

  try {
    const body = await request.json();
    const playerId = Number(body.playerId);
    const optionId = String(body.optionId ?? "").trim();
    const optionId2 = typeof body.optionId2 === "string" ? body.optionId2.trim() || null : null;
    const pickupClub = typeof body.pickupClub === "string" ? body.pickupClub.trim() : null;
    const pickupNote = typeof body.pickupNote === "string" ? body.pickupNote.trim() || null : null;

    if (!playerId || !optionId) {
      return NextResponse.json({ error: "playerId and optionId required" }, { status: 400 });
    }

    // Auth checks outside the transaction (read-only, no race risk)
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
      select: { email: true },
    });
    const isAdmin = playerRecord?.email
      ? (await prisma.adminUser.count({ where: { email: playerRecord.email, active: true } })) > 0
      : false;

    const playerRegistration = await prisma.tournamentRegistration.findFirst({
      where: { playerId, tournamentYear, status: "Confirmed" },
    });
    const hasRegistration = playerRegistration != null;

    if (!isAdmin && !hasRegistration) {
      return NextResponse.json({ error: "No registration found for this player." }, { status: 403 });
    }

    let giveawayResult: { id: string; optionId: string; optionId2: string | null };

    // Retry loop: SERIALIZABLE transactions can fail with P2034 when two concurrent
    // transactions read the same rows and both try to commit. On conflict, one retries.
    const MAX_RETRIES = 3;
    let lastError: unknown;
    let succeeded = false;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        giveawayResult = await prisma.$transaction(async (tx) => {
          const opt1 = await tx.tumblerOption.findUnique({
            where: { tournamentYear_optionId: { tournamentYear, optionId } },
            select: { stock: true, status: true },
          });
          if (!opt1) throw Object.assign(new Error("Option not found"), { code: "NOT_FOUND" });
          if (opt1.status === "Unavailable") throw Object.assign(new Error("This option is no longer available."), { code: "OPTION_FULL" });

          let opt2: { stock: number; status: string } | null = null;
          if (optionId2) {
            opt2 = await tx.tumblerOption.findUnique({
              where: { tournamentYear_optionId: { tournamentYear, optionId: optionId2 } },
              select: { stock: true, status: true },
            });
            if (!opt2) throw Object.assign(new Error("Second option not found"), { code: "NOT_FOUND" });
            if (opt2.status === "Unavailable") throw Object.assign(new Error("The second option is no longer available."), { code: "OPTION_FULL_2" });
          }

          // Count current selections excluding this player (handles both new + update)
          const [c1a, c1b] = await Promise.all([
            tx.giveaway.count({ where: { tournamentYear, optionId, NOT: { playerId } } }),
            tx.giveaway.count({ where: { tournamentYear, optionId2: optionId, NOT: { playerId } } }),
          ]);
          if (c1a + c1b >= opt1.stock) {
            throw Object.assign(new Error("This option is no longer available."), { code: "OPTION_FULL" });
          }

          if (optionId2 && opt2) {
            const [c2a, c2b] = await Promise.all([
              tx.giveaway.count({ where: { tournamentYear, optionId: optionId2, NOT: { playerId } } }),
              tx.giveaway.count({ where: { tournamentYear, optionId2: optionId2, NOT: { playerId } } }),
            ]);
            if (c2a + c2b >= opt2.stock) {
              throw Object.assign(new Error("The second option is no longer available."), { code: "OPTION_FULL_2" });
            }
          }

          // Capture previous choice so we can recheck old options after switch
          const existing = await tx.giveaway.findFirst({
            where: { tournamentYear, playerId },
            select: { optionId: true, optionId2: true },
          });

          const upserted = await tx.giveaway.upsert({
            where: { tournamentYear_playerId: { tournamentYear, playerId } },
            create: { tournamentYear, playerId, optionId, optionId2: isAdmin && hasRegistration ? optionId2 : null, pickupClub, pickupNote },
            update: { optionId, optionId2: isAdmin && hasRegistration ? optionId2 : null, pickupClub, pickupNote },
          });

          // Recount and update status for every option that may have changed
          const affected = new Set([optionId]);
          if (optionId2) affected.add(optionId2);
          if (existing?.optionId) affected.add(existing.optionId);
          if (existing?.optionId2) affected.add(existing.optionId2);

          for (const oid of affected) {
            const [ca, cb] = await Promise.all([
              tx.giveaway.count({ where: { tournamentYear, optionId: oid } }),
              tx.giveaway.count({ where: { tournamentYear, optionId2: oid } }),
            ]);
            const opt = await tx.tumblerOption.findUnique({
              where: { tournamentYear_optionId: { tournamentYear, optionId: oid } },
              select: { stock: true },
            });
            if (opt) {
              await tx.tumblerOption.update({
                where: { tournamentYear_optionId: { tournamentYear, optionId: oid } },
                data: { status: ca + cb >= opt.stock ? "Unavailable" : "Available" },
              });
            }
          }

          return { id: upserted.id, optionId: upserted.optionId, optionId2: upserted.optionId2 ?? null };
        }, { isolationLevel: "Serializable" });

        succeeded = true;
        break;
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === "P2034" && attempt < MAX_RETRIES - 1) {
          // Serialization conflict — retry
          lastError = e;
          continue;
        }
        if (code === "OPTION_FULL" || code === "OPTION_FULL_2") {
          const msg = code === "OPTION_FULL_2"
            ? "The second option is no longer available."
            : "This option is no longer available.";
          const freshOptions = await getOptionsWithCounts(tournamentYear);
          return NextResponse.json({ error: msg, options: freshOptions }, { status: 409 });
        }
        if (code === "NOT_FOUND") return NextResponse.json({ error: "Option not found." }, { status: 404 });
        throw e;
      }
    }

    if (!succeeded) throw lastError;

    const updatedOptions = await getOptionsWithCounts(tournamentYear);

    return NextResponse.json({
      id: giveawayResult.id,
      optionId: giveawayResult.optionId,
      optionId2: giveawayResult.optionId2,
      tournamentYear,
      options: updatedOptions,
    });
  } catch (e) {
    console.error("POST /api/giveaway/[year]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
