// FILE: app/api/auth/browser-session/route.ts
// Mint httpOnly browser session after zkLogin — used by first-party flows.

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { createClient } from "@supabase/supabase-js";
import {
  attachBrowserSessionCookie,
  clearBrowserSessionCookie,
  issueBrowserSessionToken,
  resolveBrowserSession,
} from "@/lib/auth/browserSession";

export async function GET(req: NextRequest) {
  const session = await resolveBrowserSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    sui_address: session.suiAddress,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { sui_address?: string };
  const raw = body.sui_address?.trim();
  if (!raw) {
    return NextResponse.json({ error: "sui_address required" }, { status: 400 });
  }

  let sui: string;
  try {
    sui = normalizeSuiAddress(raw);
  } catch {
    return NextResponse.json({ error: "Invalid sui_address" }, { status: 400 });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (sbUrl && sbKey) {
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    const { data } = await sb
      .from("sui_zklogin_identities")
      .select("sui_address")
      .eq("sui_address", sui)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "Account not registered" }, { status: 403 });
    }
  }

  const token = await issueBrowserSessionToken(sui);
  if (!token) {
    return NextResponse.json({ error: "Session signing unavailable" }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true, sui_address: sui });
  attachBrowserSessionCookie(res, token, {
    secure: req.nextUrl.protocol === "https:",
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  clearBrowserSessionCookie(res, {
    secure: req.nextUrl.protocol === "https:",
  });
  return res;
}
