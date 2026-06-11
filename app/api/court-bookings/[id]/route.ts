import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COURT_OPTIONS } from "@/lib/content/courts";

/** DELETE /api/court-bookings/[id] — hard-delete a booking record and clear match schedule info. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const booking = await prisma.courtBooking.findUnique({ where: { id } });

    await prisma.$transaction(async (tx) => {
      await tx.courtBooking.delete({ where: { id } });
      if (booking?.matchId) {
        await tx.match.update({
          where: { id: booking.matchId },
          data: { date: null, time: null, location: null },
        });
      }
    });

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
    if ("matchId" in body) data.matchId = body.matchId ?? null;
    if ("notes" in body) data.notes = body.notes ?? null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const existing = await prisma.courtBooking.findUnique({ where: { id } });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.courtBooking.update({ where: { id }, data });

      const oldMatchId = existing?.matchId ?? null;
      const newMatchId = ("matchId" in body ? body.matchId : existing?.matchId) ?? null;
      const newStatus = ("status" in body ? body.status : existing?.status) ?? null;

      // Clear old match's schedule if the match changed or booking was cancelled
      if (oldMatchId && (oldMatchId !== newMatchId || newStatus === "Available")) {
        await tx.match.update({
          where: { id: oldMatchId },
          data: { date: null, time: null, location: null },
        });
      }

      // Set new match's schedule if a match is now linked and status is Booked
      if (newMatchId && newMatchId !== oldMatchId && newStatus !== "Available") {
        const court = COURT_OPTIONS.find((c) => c.id === result.courtId);
        if (court) {
          await tx.match.update({
            where: { id: newMatchId },
            data: { date: result.date, time: court.timeSlot, location: court.name },
          });
        }
      }

      return result;
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/court-bookings/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
