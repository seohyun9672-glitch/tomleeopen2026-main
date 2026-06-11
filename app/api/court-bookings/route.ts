import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COURT_OPTIONS } from "@/lib/content/courts";
import { addDays, getToday } from "@/lib/utils";

/**
 * GET /api/court-bookings — all pre-seeded court slots with their current status.
 * GET /api/court-bookings?playerName=&year= — preliminary matches for a player (by name search).
 * GET /api/court-bookings?admin=1 — all slots (for admin, filters client-side).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerName = searchParams.get("playerName");
  const admin = searchParams.get("admin") === "1";

  try {
    if (playerName) {
      const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
      const nameLower = playerName.toLowerCase().trim();
      if (!nameLower) return NextResponse.json([]);

      // Find players matching the name
      const players = await prisma.player.findMany({
        select: { id: true, fullNameEn: true, fullNameKo: true },
        take: 300,
      });
      const matchedPlayerIds = players
        .filter((p) =>
          p.fullNameEn.toLowerCase().includes(nameLower) ||
          (p.fullNameKo ?? "").toLowerCase().includes(nameLower)
        )
        .map((p) => p.id);

      if (matchedPlayerIds.length === 0) return NextResponse.json([]);

      // Find teams containing any of those players
      const teams = await prisma.team.findMany({
        where: {
          tournamentYear: year,
          OR: [
            { member1PlayerId: { in: matchedPlayerIds } },
            { member2PlayerId: { in: matchedPlayerIds } },
          ],
        },
        select: { id: true },
      });
      const teamIds = teams.map((t) => t.id);
      if (teamIds.length === 0) return NextResponse.json([]);

      const matches = await prisma.match.findMany({
        where: {
          tournamentYear: year,
          round: "Pre",
          OR: [{ team1Id: { in: teamIds } }, { team2Id: { in: teamIds } }],
        },
        include: {
          category: { select: { label: true, labelKo: true } },
          team1: {
            include: {
              member1: { select: { fullNameEn: true, fullNameKo: true } },
              member2: { select: { fullNameEn: true, fullNameKo: true } },
            },
          },
          team2: {
            include: {
              member1: { select: { fullNameEn: true, fullNameKo: true } },
              member2: { select: { fullNameEn: true, fullNameKo: true } },
            },
          },
          courtBooking: { select: { courtId: true, date: true } },
        },
        orderBy: { id: "asc" },
      });

      // Attach myTeamId: the team in this match that contains the searching player
      return NextResponse.json(
        matches.map((m) => ({
          id: m.id,
          myTeamId: teamIds.includes(m.team1Id ?? "") ? m.team1Id : m.team2Id,
          category: m.category,
          team1Id: m.team1Id,
          team2Id: m.team2Id,
          team1: m.team1,
          team2: m.team2,
          courtBooking: m.courtBooking,
        }))
      );
    }

    if (admin) {
      const bookings = await prisma.courtBooking.findMany({
        orderBy: [{ date: "asc" }, { courtId: "asc" }],
      });

      const matchIds: string[] = bookings
        .map((b) => b.matchId)
        .filter((id): id is string => id !== null);

      const teamIds: string[] = [...new Set(
        bookings.map((b) => b.teamId).filter((id): id is string => id !== null)
      )];

      const [matchRows, teamRows] = await Promise.all([
        prisma.match.findMany({
          where: { id: { in: matchIds } },
          include: {
            team1: {
              include: {
                member1: { select: { fullNameEn: true, fullNameKo: true } },
                member2: { select: { fullNameEn: true, fullNameKo: true } },
              },
            },
            team2: {
              include: {
                member1: { select: { fullNameEn: true, fullNameKo: true } },
                member2: { select: { fullNameEn: true, fullNameKo: true } },
              },
            },
            category: { select: { label: true, labelKo: true } },
          },
        }),
        prisma.team.findMany({
          where: { id: { in: teamIds } },
          include: {
            member1: { select: { fullNameEn: true, fullNameKo: true } },
            member2: { select: { fullNameEn: true, fullNameKo: true } },
            category: { select: { label: true, labelKo: true } },
          },
        }),
      ]);

      const matchMap = new Map(matchRows.map((m) => [m.id, m]));
      const teamMap = new Map(teamRows.map((t) => [t.id, t]));
      const courtMap = new Map(COURT_OPTIONS.map((c) => [c.id, c]));

      return NextResponse.json(
        bookings.map((b) => ({
          ...b,
          court: courtMap.get(b.courtId) ?? null,
          team: b.teamId ? (teamMap.get(b.teamId) ?? null) : null,
          match: b.matchId ? (matchMap.get(b.matchId) ?? null) : null,
        }))
      );
    }

    // Default: return all pre-seeded slots with their current status
    const slots = await prisma.courtBooking.findMany({
      select: { courtId: true, date: true, status: true },
      orderBy: [{ date: "asc" }, { courtId: "asc" }],
    });

    const courtMap = new Map(COURT_OPTIONS.map((c) => [c.id, c]));
    return NextResponse.json(
      slots.map((s) => ({
        courtId: s.courtId,
        courtName: courtMap.get(s.courtId)?.name ?? s.courtId,
        courtNameKo: courtMap.get(s.courtId)?.nameKo ?? s.courtId,
        date: s.date,
        timeSlot: courtMap.get(s.courtId)?.timeSlot ?? "",
        href: courtMap.get(s.courtId)?.href ?? "",
        status: s.status,
      }))
    );
  } catch (e) {
    console.error("GET /api/court-bookings", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST /api/court-bookings — book a slot by updating the pre-seeded Available record. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courtId, date, teamId, matchId, notes } = body;

    if (!courtId || !date || !teamId) {
      return NextResponse.json({ error: "courtId, date, teamId are required" }, { status: 400 });
    }

    // Enforce 7-day booking window
    const today = getToday();
    const windowEnd = addDays(today, 6);
    if (date < today || date > windowEnd) {
      return NextResponse.json({ error: "Courts can only be booked up to 7 days in advance." }, { status: 400 });
    }

    // Validate match ownership if provided
    if (matchId) {
      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match) return NextResponse.json({ error: "Match not found" }, { status: 400 });
      if (match.team1Id !== teamId && match.team2Id !== teamId) {
        return NextResponse.json({ error: "Team is not part of this match" }, { status: 400 });
      }
    }

    const slot = await prisma.courtBooking.findUnique({
      where: { courtId_date: { courtId, date } },
    });

    if (!slot) {
      return NextResponse.json({ error: "Court slot not found" }, { status: 404 });
    }
    if (slot.status === "Booked") {
      return NextResponse.json({ error: "This slot is already booked" }, { status: 409 });
    }

    const court = COURT_OPTIONS.find((c) => c.id === courtId);

    await prisma.$transaction(async (tx) => {
      await tx.courtBooking.update({
        where: { id: slot.id },
        data: {
          teamId,
          matchId: matchId || null,
          status: "Booked",
          notes: notes?.trim() || null,
        },
      });
      if (matchId && court) {
        await tx.match.update({
          where: { id: matchId },
          data: { date, time: court.timeSlot, location: court.name },
        });
      }
    });

    return NextResponse.json({ id: slot.id });
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "This slot is already booked" }, { status: 409 });
    }
    console.error("POST /api/court-bookings", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
