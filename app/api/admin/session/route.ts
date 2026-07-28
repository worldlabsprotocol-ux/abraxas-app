// FILE: app/api/admin/session/route.ts
// Exchange admin PIN for httpOnly session cookie (pilot reviewers).

import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieMaxAgeSec,
  adminSessionCookieValue,
  checkAdmin,
} from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { pin?: string };
  const pin = body.pin ?? req.headers.get("x-admin-pin") ?? "";

  const pinReq = new Request(req.url, {
    headers: new Headers({ "x-admin-pin": pin }),
  });

  if (!checkAdmin(pinReq as unknown as NextRequest)) {
    return NextResponse.json({ error: "Invalid admin PIN" }, { status: 401 });
  }

  const token = adminSessionCookieValue();
  if (!token) {
    return NextResponse.json({ error: "Admin PIN not configured" }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: adminSessionCookieMaxAgeSec(),
  });
  return res;
}
