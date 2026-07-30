import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COURT_OPTIONS } from "@/lib/content/courts";
import { computeMatchStatus } from "@/lib/matches";

function courtStartUtcMs(dateStr: string, courtId: string): number | null {
  const court = COURT_OPTIONS.find((c) => c.id === courtId);
  if (!court) return null;
  const m = court.timeSlot.match(/^(\d{1,2}):(\d{2})\s*[–-].*\b(am|pm)$/i);
  if (!m) return null;
  let hour = parseInt(m[1]);
  const minute = parseInt(m[2]);
  if (m[3].toLowerCase() === "pm" && hour !== 12) hour += 12;
  if (m[3].toLowerCase() === "am" && hour === 12) hour = 0;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, hour, minute));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(guess);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0");
  const vanH = get("hour") === 24 ? 0 : get("hour");
  const vanM = get("minute");
  return guess.getTime() + ((hour - vanH) * 60 + (minute - vanM)) * 60_000;
}

/** DELETE /api/court-bookings/[id] — hard-delete a booking record and clear match schedule info. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const booking = await prisma.courtBooking.findUnique({ where: { id } });

    if (booking) {
      const courtStart = courtStartUtcMs(booking.date, booking.courtId);
      if (courtStart !== null && courtStart - Date.now() <= 48 * 60 * 60 * 1000) {
        return NextResponse.json({ error: "Cancel window has passed." }, { status: 403 });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.courtBooking.delete({ where: { id } });
      if (booking?.matchId) {
        const existingMatch = await tx.match.findUnique({
          where: { id: booking.matchId },
          select: { matchStatus: true, set1ScoreTeam1: true, set1ScoreTeam2: true, set2ScoreTeam1: true, set2ScoreTeam2: true },
        });
        const clearedStatus = computeMatchStatus(
          existingMatch?.matchStatus ?? "Pending",
          null, null, null,
          existingMatch?.set1ScoreTeam1 ?? null, existingMatch?.set1ScoreTeam2 ?? null,
          existingMatch?.set2ScoreTeam1 ?? null, existingMatch?.set2ScoreTeam2 ?? null,
        );
        await tx.match.update({
          where: { id: booking.matchId },
          data: { date: null, time: null, location: null, matchStatus: clearedStatus },
        });
      }
    });

    revalidateTag("all-matches", "default");
    revalidatePath("/draws");
    revalidatePath("/ko/draws");
    revalidatePath("/admin");
    revalidatePath("/ko/admin");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/court-bookings/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** PATCH /api/court-bookings/[id] — update status/teamId/matchId/notes and sync match schedule. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if ("status" in body) data.status = body.status;
    if ("teamId" in body) data.teamId = body.teamId ?? null;
    if ("matchId" in body) {
      data.match = body.matchId
        ? { connect: { id: body.matchId } }
        : { disconnect: true };
    }
    if ("notes" in body) data.notes = body.notes ?? null;
    if (body.status === "Available") data.bookedByPlayer = { disconnect: true };

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const existing = await prisma.courtBooking.findUnique({ where: { id } });

    const updated = await prisma.$transaction(async (tx) => {
      // `matchId` is unique across CourtBooking — if this match is being
      // moved here from a different court/date, that other booking still
      // holds the same matchId and must be freed first, both to satisfy the
      // unique constraint and so the old court slot actually reflects that
      // it's open again instead of silently still showing as booked.
      if (typeof data.match === "object" && data.match && "connect" in data.match) {
        const newMatchId = (data.match as { connect: { id: string } }).connect.id;
        const conflicting = await tx.courtBooking.findUnique({ where: { matchId: newMatchId } });
        if (conflicting && conflicting.id !== id) {
          await tx.courtBooking.update({
            where: { id: conflicting.id },
            data: { match: { disconnect: true }, teamId: null, status: "Available", bookedByPlayer: { disconnect: true } },
          });
        }
      }

      const result = await tx.courtBooking.update({ where: { id }, data });

      const oldMatchId = existing?.matchId ?? null;
      const newMatchId = ("matchId" in body ? body.matchId : existing?.matchId) ?? null;
      const newStatus = ("status" in body ? body.status : existing?.status) ?? null;

      // Clear old match's schedule if the match changed or booking was cancelled
      if (oldMatchId && (oldMatchId !== newMatchId || newStatus === "Available")) {
        const oldMatch = await tx.match.findUnique({
          where: { id: oldMatchId },
          select: { matchStatus: true, set1ScoreTeam1: true, set1ScoreTeam2: true, set2ScoreTeam1: true, set2ScoreTeam2: true },
        });
        const clearedStatus = computeMatchStatus(
          oldMatch?.matchStatus ?? "Pending",
          null, null, null,
          oldMatch?.set1ScoreTeam1 ?? null, oldMatch?.set1ScoreTeam2 ?? null,
          oldMatch?.set2ScoreTeam1 ?? null, oldMatch?.set2ScoreTeam2 ?? null,
        );
        await tx.match.update({
          where: { id: oldMatchId },
          data: { date: null, time: null, location: null, matchStatus: clearedStatus },
        });
      }

      // Set new match's schedule if a match is now linked and status is Booked
      if (newMatchId && newMatchId !== oldMatchId && newStatus !== "Available") {
        const court = COURT_OPTIONS.find((c) => c.id === result.courtId);
        if (court) {
          const existingMatch = await tx.match.findUnique({
            where: { id: newMatchId },
            select: { matchStatus: true, set1ScoreTeam1: true, set1ScoreTeam2: true, set2ScoreTeam1: true, set2ScoreTeam2: true },
          });
          const newMatchStatus = computeMatchStatus(
            existingMatch?.matchStatus ?? "Pending",
            result.date, court.timeSlot, court.name,
            existingMatch?.set1ScoreTeam1 ?? null, existingMatch?.set1ScoreTeam2 ?? null,
            existingMatch?.set2ScoreTeam1 ?? null, existingMatch?.set2ScoreTeam2 ?? null,
          );
          await tx.match.update({
            where: { id: newMatchId },
            data: { date: result.date, time: court.timeSlot, location: court.name, matchStatus: newMatchStatus },
          });
        }
      }

      return result;
    });

    revalidateTag("all-matches", "default");
    revalidatePath("/draws");
    revalidatePath("/ko/draws");
    revalidatePath("/schedule");
    revalidatePath("/ko/schedule");
    revalidatePath("/admin");
    revalidatePath("/ko/admin");
    revalidatePath("/court-booking");
    revalidatePath("/ko/court-booking");

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/court-bookings/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
