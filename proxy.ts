
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Locale routing via app/[locale]/:
 *  /ko/...  → serves app/[locale] with locale="ko" (no rewrite needed)
 *  /...     → rewrite to /en/... so app/[locale] sees locale="en"
 *
 * The browser URL is always the original (/ not /en/), so English links stay clean.
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes — skip locale rewrite
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

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
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:svg|SVG|png|PNG|jpg|JPG|jpeg|JPEG|gif|GIF|webp|WEBP|ico|ICO)$).*)"],
};
