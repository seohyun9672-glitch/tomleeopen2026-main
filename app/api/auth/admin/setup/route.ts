import { NextResponse } from "next/server";
import { createAdminUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    const result = await createAdminUser(email, password);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/auth/admin/setup", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
