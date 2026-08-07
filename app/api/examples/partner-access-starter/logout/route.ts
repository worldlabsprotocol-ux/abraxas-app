// FILE: app/api/examples/partner-access-starter/logout/route.ts
import { NextResponse } from "next/server";
import { STARTER_BASE_PATH } from "@/examples/partner-access-nextjs-starter/lib/constants";
import {
  assessStarterRuntime,
  starterDisabledApiResponse,
} from "@/examples/partner-access-nextjs-starter/lib/runtimeGate";
import { STARTER_SESSION_COOKIE } from "@/examples/partner-access-nextjs-starter/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const runtime = assessStarterRuntime();
  if (!runtime.enabled) {
    return starterDisabledApiResponse();
  }

  if (!runtime.ready) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
