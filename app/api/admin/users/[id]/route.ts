import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/users/[id] — toggle active status. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active (boolean) is required" }, { status: 400 });
    }
    await prisma.adminUser.update({ where: { id }, data: { active: body.active } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/admin/users/[id]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/** DELETE /api/admin/users/[id] — remove admin user. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.adminUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/users/[id]", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
