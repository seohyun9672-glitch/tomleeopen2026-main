import { NextResponse } from "next/server";
import { checkAdminEmail } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    const result = await checkAdminEmail(email);
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/auth/admin/check-email", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
