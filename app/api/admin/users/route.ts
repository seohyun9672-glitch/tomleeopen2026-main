import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** POST /api/admin/users — create a stub AdminUser (no password; user sets it via login setup). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "This email is already in the system" }, { status: 409 });

    await prisma.adminUser.create({
      data: { email, active: false },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/users", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
