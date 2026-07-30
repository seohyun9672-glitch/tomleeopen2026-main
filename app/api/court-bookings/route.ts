import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COURT_OPTIONS, deriveCourtBookingStatus, isExcludedDate, type CourtBookingStatus } from "@/lib/content/courts";
import { addDays, getDayOfWeek, getToday, getYear } from "@/lib/utils";
import { ROUND_PRE } from "@/lib/round";

/**
 * Extracts the start time from a range string like "7:00 – 9:00 PM" → "7:00 PM".
 * All court slots are PM; the AM/PM suffix applies to both ends of the range.
 */
function startTimeFromSlot(slot: string): string {
  const m = slot.match(/^(\d{1,2}:\d{2})\s*[–-].*\b(am|pm)$/i);
  if (!m) return slot;
  return `${m[1]} ${m[2].toUpperCase()}`;
}

/**
 * GET /api/court-bookings — all pre-seeded court slots with their current status.
 * GET /api/court-bookings?playerId=&year= — non-completed matches for a player (by ID).
 * GET /api/court-bookings?playerName=&year= — preliminary matches for a player (by name search).
 * GET /api/court-bookings?admin=1 — all slots (for admin, filters client-side).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");
  const playerName = searchParams.get("playerName");
  const admin = searchParams.get("admin") === "1";
  const bookingsOnly = searchParams.get("bookings") === "1";

  const COMPLETED_STATUSES = ["completed", "cancelled", "canceled"];

  try {
    if (playerId) {
      const year = parseInt(searchParams.get("year") ?? String(getYear()), 10);
      const playerIdInt = parseInt(playerId, 10);
      if (isNaN(playerIdInt)) return NextResponse.json([]);

      const teams = await prisma.team.findMany({
        where: {
          tournamentYear: year,
          OR: [
            { member1PlayerId: playerIdInt },
            { member2PlayerId: playerIdInt },
          ],
        },
        select: { id: true },
      });
      const teamIds = teams.map((t) => t.id);
      if (teamIds.length === 0) return NextResponse.json([]);

      const matchWhere = bookingsOnly
        ? {
            tournamentYear: year,
            OR: [{ team1Id: { in: teamIds } }, { team2Id: { in: teamIds } }],
            courtBooking: { isNot: null },
          }
        : {
            tournamentYear: year,
            OR: [{ team1Id: { in: teamIds } }, { team2Id: { in: teamIds } }],
            NOT: { matchStatus: { in: COMPLETED_STATUSES } },
          };

      const matches = await prisma.match.findMany({
        where: matchWhere,
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
          courtBooking: { select: { id: true, courtId: true, date: true, createdAt: true } },
        },
        orderBy: { id: "asc" },
      });

      return NextResponse.json(
        matches.map((m) => ({
          id: m.id,
          myTeamId: teamIds.includes(m.team1Id ?? "") ? m.team1Id : m.team2Id,
          category: m.category,
          round: m.round,
          matchStatus: m.matchStatus,
          team1Id: m.team1Id,
          team2Id: m.team2Id,
          team1: m.team1,
          team2: m.team2,
          courtBooking: m.courtBooking
            ? { ...m.courtBooking, createdAt: m.courtBooking.createdAt.toISOString() }
            : null,
        }))
      );
    }

    if (playerName) {
      const year = parseInt(searchParams.get("year") ?? String(getYear()), 10);
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
          round: ROUND_PRE,
          OR: [{ team1Id: { in: teamIds } }, { team2Id: { in: teamIds } }],
        },
        include: {
          category: { select: { id: true, label: true, labelKo: true } },
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

      const bookedByPlayerIds: number[] = [...new Set(
        bookings.map((b) => b.bookedByPlayerId).filter((id): id is number => id !== null)
      )];

      const [matchRows, teamRows, bookedByPlayerRows] = await Promise.all([
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
            category: { select: { id: true, label: true, labelKo: true } },
          },
        }),
        prisma.team.findMany({
          where: { id: { in: teamIds } },
          include: {
            member1: { select: { fullNameEn: true, fullNameKo: true } },
            member2: { select: { fullNameEn: true, fullNameKo: true } },
            category: { select: { id: true, label: true, labelKo: true } },
          },
        }),
        prisma.player.findMany({
          where: { id: { in: bookedByPlayerIds } },
          select: { id: true, fullNameEn: true, fullNameKo: true },
        }),
      ]);

      const matchMap = new Map(matchRows.map((m) => [m.id, m]));
      const teamMap = new Map(teamRows.map((t) => [t.id, t]));
      const bookedByMap = new Map(bookedByPlayerRows.map((p) => [p.id, p]));
      const courtMap = new Map(COURT_OPTIONS.map((c) => [c.id, c]));

      return NextResponse.json(
        bookings
          .filter((b) => { const c = courtMap.get(b.courtId); return !c || !isExcludedDate(c, b.date); })
          .map((b) => ({
            ...b,
            court: courtMap.get(b.courtId) ?? null,
            team: b.teamId ? (teamMap.get(b.teamId) ?? null) : null,
            match: b.matchId ? (matchMap.get(b.matchId) ?? null) : null,
            bookedByPlayer: b.bookedByPlayerId ? (bookedByMap.get(b.bookedByPlayerId) ?? null) : null,
          }))
      );
    }

    // Default: return all pre-seeded slots with their current status
    const slots = await prisma.courtBooking.findMany({
      select: { courtId: true, date: true, status: true },
      orderBy: [{ date: "asc" }, { courtId: "asc" }],
    });

    const courtMap = new Map(COURT_OPTIONS.map((c) => [c.id, c]));

    // Lazily transition slots whose start time has passed:
    // Available -> Expired, Booked -> Completed
    const toTransition = slots
      .map((s) => {
        const court = courtMap.get(s.courtId);
        const effective = deriveCourtBookingStatus(s.status, s.date, court?.timeSlot ?? "");
        return effective !== s.status ? { slot: s, effective } : null;
      })
      .filter((x): x is { slot: (typeof slots)[number]; effective: CourtBookingStatus } => x !== null);
    if (toTransition.length > 0) {
      await prisma.$transaction(
        toTransition.map(({ slot, effective }) =>
          prisma.courtBooking.update({
            where: { courtId_date: { courtId: slot.courtId, date: slot.date } },
            data: { status: effective },
          })
        )
      );
      toTransition.forEach(({ slot, effective }) => { slot.status = effective; });
    }

    return NextResponse.json(
      slots
        .filter((s) => { const c = courtMap.get(s.courtId); return !c || !isExcludedDate(c, s.date); })
        .map((s) => ({
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
    const { courtId, date, teamId, matchId, notes, playerIds: callerPlayerIds } = body;

    if (!courtId || !date || !teamId) {
      return NextResponse.json({ error: "courtId, date, teamId are required" }, { status: 400 });
    }

    // Enforce 7-day booking window
    const today = getToday();
    const windowEnd = addDays(today, 7);
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

    // Enforce one booking per player per calendar week (Sun–Sat)
    const team = await prisma.team.findFirst({
      where: { id: teamId },
      select: { member1PlayerId: true, member2PlayerId: true, tournamentYear: true },
    });
    if (team) {
      const dayOfWeek = getDayOfWeek(date);
      const weekStart = addDays(date, -dayOfWeek);
      const weekEnd = addDays(date, 6 - dayOfWeek);

      const playerIds = [team.member1PlayerId, team.member2PlayerId].filter(Boolean) as number[];

      const allTeams = await prisma.team.findMany({
        where: {
          tournamentYear: team.tournamentYear,
          OR: [
            { member1PlayerId: { in: playerIds } },
            { member2PlayerId: { in: playerIds } },
          ],
        },
        select: { id: true },
      });
      const allTeamIds = allTeams.map((t) => t.id);

      const existingBooking = await prisma.courtBooking.findFirst({
        where: {
          teamId: { in: allTeamIds },
          status: "Booked",
          date: { gte: weekStart, lte: weekEnd },
        },
      });

      if (existingBooking) {
        return NextResponse.json(
          { error: "You have already booked a court this week. Each player may only book once per week." },
          { status: 409 }
        );
      }
    }

    const slot = await prisma.courtBooking.findUnique({
      where: { courtId_date: { courtId, date } },
    });

    if (!slot) {
      return NextResponse.json({ error: "Court slot not found" }, { status: 404 });
    }

    const court = COURT_OPTIONS.find((c) => c.id === courtId);

    // Resolve which caller player is on the booking team
    const bookedByPlayerId: number | null = (() => {
      if (!team || !Array.isArray(callerPlayerIds)) return null;
      return callerPlayerIds.find(
        (id: number) => id === team.member1PlayerId || id === team.member2PlayerId
      ) ?? null;
    })();

    await prisma.$transaction(async (tx) => {
      const current = await tx.courtBooking.findUnique({
        where: { courtId_date: { courtId, date } },
        select: { status: true },
      });

      if (!current || current.status !== "Available") {
        throw Object.assign(new Error("ALREADY_BOOKED"), { code: "ALREADY_BOOKED" });
      }

      await tx.courtBooking.update({
        where: { courtId_date: { courtId, date } },
        data: {
          teamId,
          match: matchId ? { connect: { id: matchId } } : undefined,
          status: "Booked",
          notes: notes?.trim() || null,
          bookedByPlayer: bookedByPlayerId ? { connect: { id: bookedByPlayerId } } : undefined,
        },
      });

      if (matchId && court) {
        await tx.match.update({
          where: { id: matchId },
          data: { date, time: startTimeFromSlot(court.timeSlot), location: court.name, matchStatus: "Scheduled" },
        });
      }
    });

    revalidateTag("all-matches", "default");
    revalidatePath("/draws");
    revalidatePath("/ko/draws");
    revalidatePath("/admin");
    revalidatePath("/ko/admin");

    return NextResponse.json({ id: slot.id });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e
      ? (e as { code: string }).code
      : null;
    if (code === "ALREADY_BOOKED" || code === "P2002") {
      return NextResponse.json({ error: "This slot is already booked" }, { status: 409 });
    }
    console.error("POST /api/court-bookings", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
