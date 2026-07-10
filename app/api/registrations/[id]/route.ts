import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTeamFromRegistration, renumberTeamsInCategory, MIN_TEAMS_FOR_ACTIVE, activateCategoryIfThresholdMet } from "@/lib/createTeam";
import { resolveOrCreatePartner } from "@/lib/resolvePartner";

async function revertCategoryStatusIfUnderThreshold(tournamentYear: number, categoryId: string) {
  const teamCount = await prisma.team.count({ where: { tournamentYear, categoryId } });
  if (teamCount < MIN_TEAMS_FOR_ACTIVE) {
    await prisma.categoryYearStatus.updateMany({
      where: { tournamentYear, categoryId, NOT: { status: "Pending" } },
      data: { status: "Pending" },
    });
  }
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
      data.partnerId = await resolveOrCreatePartner(body.partnerName, existing?.playerId ?? 0);
    }

    if (typeof body.playerId === "number" && body.playerId > 0) {
      data.playerId = body.playerId;
    }

    if ("paymentReceived" in body) {
      data.paymentReceived = Boolean(body.paymentReceived);
    }

    // Accept explicit status from admin; if category is Inactive, force Cancelled
    if (typeof body.status === "string" && body.status.trim()) {
      data.status = body.status.trim();
    }

    // Enforce Inactive category → Cancelled when status or category changes
    if ("status" in body || "categoryId" in body) {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id },
        select: { categoryId: true, tournamentYear: true },
      });
      if (reg) {
        const effectiveCatId = (data.categoryId as string | undefined) ?? reg.categoryId;
        const catStatus = await prisma.categoryYearStatus.findFirst({
          where: { categoryId: effectiveCatId, tournamentYear: reg.tournamentYear },
          select: { status: true },
        });
        if (catStatus?.status === "Inactive") {
          data.status = "Cancelled";
        }
      }
    }

    const current = await prisma.tournamentRegistration.findUnique({
      where: { id },
      select: { categoryId: true, tournamentYear: true, playerId: true, partnerId: true },
    });

    const updated = await prisma.tournamentRegistration.update({ where: { id }, data });

    // When category changes, migrate associated teams to the new category.
    // Use createTeamFromRegistration so member order is normalized and no duplicate
    // is created if a team with the same players already exists in the new category
    // (e.g. the partner already submitted a registration there first).
    if (current && typeof data.categoryId === "string" && data.categoryId !== current.categoryId) {
      const oldCatId = current.categoryId;
      const newCatId = data.categoryId;

      const teamsToMigrate = await prisma.team.findMany({
        where: {
          tournamentYear: current.tournamentYear,
          categoryId: oldCatId,
          OR: [
            { member1PlayerId: current.playerId },
            { member2PlayerId: current.playerId },
          ],
        },
      });

      for (const team of teamsToMigrate) {
        const oldTeamId = team.id;

        // Create the team in the new category (skips if already exists)
        await createTeamFromRegistration({
          tournamentYear: team.tournamentYear,
          categoryId: newCatId,
          playerId: team.member1PlayerId,
          partnerId: team.member2PlayerId,
        });

        // Find the team now in the new category (just created or pre-existing)
        const m2 = team.member2PlayerId;
        const newTeam = await prisma.team.findFirst({
          where: {
            tournamentYear: team.tournamentYear,
            categoryId: newCatId,
            OR: m2 != null
              ? [
                  { member1PlayerId: team.member1PlayerId, member2PlayerId: m2 },
                  { member1PlayerId: m2, member2PlayerId: team.member1PlayerId },
                ]
              : [{ member1PlayerId: team.member1PlayerId, member2PlayerId: null }],
          },
          select: { id: true },
        });

        if (!newTeam) continue;

        // Redirect match references from the old team to the new one, then delete old
        await prisma.$transaction([
          prisma.match.updateMany({
            where: { tournamentYear: team.tournamentYear, team1Id: oldTeamId },
            data: { team1Id: newTeam.id },
          }),
          prisma.match.updateMany({
            where: { tournamentYear: team.tournamentYear, team2Id: oldTeamId },
            data: { team2Id: newTeam.id },
          }),
          prisma.team.delete({
            where: { tournamentYear_id: { tournamentYear: team.tournamentYear, id: oldTeamId } },
          }),
        ]);
      }
    }

    // When playerId or partnerId changes, rebuild the team.
    // Skip if categoryId also changed — that block already handles team migration.
    const categoryChanged = current && typeof data.categoryId === "string" && data.categoryId !== current.categoryId;
    const needsTeamRebuild = !categoryChanged && current && ("playerId" in data || "partnerId" in data);
    if (needsTeamRebuild && current) {
      const effectivePlayerId = "playerId" in data ? (data.playerId as number) : current.playerId;
      const effectivePartnerId = "partnerId" in data ? (data.partnerId as number | null) : current.partnerId;
      const effectiveCategoryId = (typeof data.categoryId === "string" ? data.categoryId : null) ?? current.categoryId;
      await prisma.team.deleteMany({
        where: {
          tournamentYear: current.tournamentYear,
          categoryId: effectiveCategoryId,
          OR: [
            { member1PlayerId: current.playerId },
            { member2PlayerId: current.playerId },
          ],
        },
      });
      await createTeamFromRegistration({
        tournamentYear: current.tournamentYear,
        categoryId: effectiveCategoryId,
        playerId: effectivePlayerId,
        partnerId: effectivePartnerId,
      });
      await revertCategoryStatusIfUnderThreshold(current.tournamentYear, effectiveCategoryId);
      await activateCategoryIfThresholdMet(current.tournamentYear, effectiveCategoryId);
    }

    // If category changed, the old category may now have fewer teams.
    if (categoryChanged && current) {
      await revertCategoryStatusIfUnderThreshold(current.tournamentYear, current.categoryId);
    }

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
    const reg = await prisma.tournamentRegistration.findUnique({
      where: { id },
      select: { playerId: true, tournamentYear: true, categoryId: true },
    });
    if (reg) {
      await prisma.team.deleteMany({
        where: {
          tournamentYear: reg.tournamentYear,
          categoryId: reg.categoryId,
          OR: [
            { member1PlayerId: reg.playerId },
            { member2PlayerId: reg.playerId },
          ],
        },
      });
    }
    await prisma.tournamentRegistration.delete({ where: { id } });
    if (reg) {
      await renumberTeamsInCategory(reg.tournamentYear, reg.categoryId);
      await revertCategoryStatusIfUnderThreshold(reg.tournamentYear, reg.categoryId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/registrations/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
