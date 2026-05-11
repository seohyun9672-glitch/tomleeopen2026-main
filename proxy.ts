
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STATIC_EXT = /\.[^/]+$/;

/**
 * Locale routing via app/[locale]/:
 *  /ko/...  → serves app/[locale] with locale="ko" (no rewrite needed)
 *  /...     → rewrite to /en/... so app/[locale] sees locale="en"
 *
 * The browser URL is always the original (/ not /en/), so English links stay clean.
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Korean prefix — Next.js routes it to app/[locale] with locale="ko" automatically
  if (pathname === "/ko" || pathname.startsWith("/ko/")) {
    return NextResponse.next();
  }

  // English — rewrite /foo → /en/foo so app/[locale] receives locale="en"
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}` || "/en";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
