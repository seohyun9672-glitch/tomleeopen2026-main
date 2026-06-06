import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** POST /api/admin-users/set-password
 *  Body: { email, password }
 *  Only succeeds if the account exists, is active, and has no password yet.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password)
      return NextResponse.json({ error: "email and password required" }, { status: 400 });

    if (password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const admin = await prisma.adminUser.findUnique({ where: { email } });

    // Return same generic error for unknown email, inactive, or already-has-password
    // to avoid leaking account info.
    if (!admin || !admin.active || admin.passwordHash !== null)
      return NextResponse.json({ error: "Not eligible to set password" }, { status: 403 });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.update({ where: { email }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin-users/set-password", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
