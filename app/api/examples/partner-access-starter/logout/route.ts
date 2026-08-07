// FILE: app/api/examples/partner-access-starter/logout/route.ts
import { NextResponse } from "next/server";
import { STARTER_BASE_PATH, STARTER_ROUTES } from "@/examples/partner-access-nextjs-starter/lib/constants";
import { STARTER_SESSION_COOKIE } from "@/examples/partner-access-nextjs-starter/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STARTER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: STARTER_BASE_PATH,
    maxAge: 0,
  });
  return response;
}
