// FILE: middleware.ts
// Keep all user traffic on the canonical production domain (abraxasworld.xyz).
// Vercel preview URLs break zkLogin cookies, OAuth callbacks, and Verify submit.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";

const CANONICAL_HOST = new URL(SITE_URL).host;

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (
    host === CANONICAL_HOST
    || host.startsWith("localhost:")
    || host === "127.0.0.1"
  ) {
    return NextResponse.next();
  }

  // Branch previews and *.vercel.app aliases → canonical domain (preserve path + query)
  if (host.endsWith(".vercel.app")) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
