import { NextResponse } from "next/server";

/** User/account registration is not used; player data is in TournamentRegistration and Player tables. */
export async function POST() {
  return NextResponse.json(
    { error: "Account registration is not available" },
    { status: 410 }
  );
}
