// FILE: middleware.ts
// Block internal diligence routes in production; noindex headers for non-public docs.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isInternalRoute } from "@/lib/internalRoutes";

const NOINDEX_PREFIXES = [
  "/investors",
  "/integrations/outreach",
  "/admin",
  "/docs/TIER3",
];

function shouldNoindex(pathname: string): boolean {
  return NOINDEX_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview");

  if (isProd && isInternalRoute(pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const res = NextResponse.next();
  if (shouldNoindex(pathname)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: [
    "/investors/:path*",
    "/integrations/outreach/:path*",
    "/admin/:path*",
  ],
};
