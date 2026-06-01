import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Derive registration status from paymentReceived + category status. */
async function deriveStatus(
  registrationId: string,
  paymentReceived: boolean,
  overrideCategoryId?: string
): Promise<"Pending" | "Confirmed" | "Cancelled"> {
  const reg = await prisma.tournamentRegistration.findUnique({
    where: { id: registrationId },
    select: { categoryId: true, tournamentYear: true },
  });
  if (!reg) return paymentReceived ? "Confirmed" : "Pending";

  const categoryId = overrideCategoryId ?? reg.categoryId;
  const catStatus = await prisma.categoryYearStatus.findFirst({
    where: { categoryId, tournamentYear: reg.tournamentYear },
    select: { status: true },
  });

  if (catStatus?.status === "Inactive") return "Cancelled";
  return paymentReceived ? "Confirmed" : "Pending";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if ("notes" in body) data.notes = body.notes?.trim() || null;
    if ("adminComments" in body) data.adminComments = body.adminComments?.trim() || null;
    if ("nameOnEtransfer" in body) data.nameOnEtransfer = body.nameOnEtransfer?.trim() || null;
    if ("photoVideoConsent" in body) data.photoVideoConsent = Boolean(body.photoVideoConsent);
    if (typeof body.categoryId === "string" && body.categoryId.trim()) data.categoryId = body.categoryId.trim();

    // Resolve partner: prefer explicit partnerId; fall back to name resolution
    if ("partnerId" in body) {
      data.partnerId = body.partnerId ?? null;
    } else if (typeof body.partnerName === "string" && body.partnerName.trim()) {
      const existing = await prisma.tournamentRegistration.findUnique({ where: { id }, select: { playerId: true } });
      const partnerName = body.partnerName.trim();
      const found = await prisma.player.findFirst({
        where: {
          id: { not: existing?.playerId ?? 0 },
          OR: [
            { fullNameEn: { equals: partnerName, mode: "insensitive" } },
            { fullNameKo: { equals: partnerName, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      if (found) {
        data.partnerId = found.id;
      } else {
        const stub = await prisma.player.create({
          data: {
            fullNameEn: partnerName,
            email: `partner-stub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@placeholder.tomlee-open`,
          },
        });
        data.partnerId = stub.id;
      }
    }

    // Derive status from paymentReceived (admin sets this; category inactivation overrides to Cancelled)
    if ("paymentReceived" in body) {
      const pr = Boolean(body.paymentReceived);
      data.paymentReceived = pr;
      data.status = await deriveStatus(id, pr, data.categoryId as string | undefined);
    }

    const updated = await prisma.tournamentRegistration.update({ where: { id }, data });
    return NextResponse.json({ id: updated.id });
  } catch (e) {
    console.error("PATCH /api/registrations/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.tournamentRegistration.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/registrations/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
