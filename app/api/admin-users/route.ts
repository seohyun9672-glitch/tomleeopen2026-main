import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/admin-users — create a new admin user (no password; set on first login). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email)
      return NextResponse.json({ error: "email required" }, { status: 400 });

    const user = await prisma.adminUser.create({
      data: { email, passwordHash: null, active: true },
    });

    return NextResponse.json({ id: user.id });
  } catch (e) {
    console.error("POST /api/admin-users", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** GET /api/admin-users — list all admin users. */
export async function GET() {
  try {
    const rows = await prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, active: true, createdAt: true },
    });
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        email: r.email,
        active: r.active,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin-users", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
