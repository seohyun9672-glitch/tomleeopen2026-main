import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/admin-users/[id] — update email and/or active status. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data: { email?: string; active?: boolean } = {};

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
      data.email = email;
    }
    if (typeof body.active === "boolean") {
      data.active = body.active;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, active: true },
    });

    return NextResponse.json(user);
  } catch (e) {
    console.error("PATCH /api/admin-users/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** DELETE /api/admin-users/[id] — delete an admin user. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.adminUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin-users/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
