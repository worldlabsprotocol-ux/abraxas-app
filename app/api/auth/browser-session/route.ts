// FILE: app/api/auth/browser-session/route.ts
// Mint httpOnly browser session after verified zkLogin — used by first-party flows.

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { createClient } from "@supabase/supabase-js";
import {
  attachBrowserSessionCookie,
  BROWSER_SESSION_COOKIE,
  issueBrowserSessionToken,
  resolveBrowserSession,
} from "@/lib/auth/browserSession";
import { verifyGoogleZkLoginIdToken } from "@/lib/auth/verifyZkLoginIdToken";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

function probeResponse(ok: boolean, status: number): NextResponse {
  return NextResponse.json({ ok }, { status, headers: NO_STORE_HEADERS });
}

export async function GET(req: NextRequest) {
  const session = await resolveBrowserSession(req);
  if (!session) {
    return probeResponse(false, 401);
  }
  return probeResponse(true, 200);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    sui_address?: string;
    id_token?: string;
    oauth_sub?: string;
  };

  const idToken = body.id_token?.trim();
  if (!idToken) {
    return NextResponse.json({ error: "id_token required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  let verified;
  try {
    verified = await verifyGoogleZkLoginIdToken(idToken, body.oauth_sub?.trim());
  } catch {
    return NextResponse.json({ error: "Invalid or expired id_token" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let sui: string;
  if (sbUrl && sbKey) {
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    const { data } = await sb
      .from("sui_zklogin_identities")
      .select("sui_address")
      .eq("oauth_sub", verified.sub)
      .maybeSingle();

    if (!data?.sui_address) {
      return NextResponse.json({ error: "Account not registered" }, { status: 403, headers: NO_STORE_HEADERS });
    }

    sui = normalizeSuiAddress(data.sui_address);

    if (body.sui_address?.trim()) {
      try {
        const requested = normalizeSuiAddress(body.sui_address.trim());
        if (requested !== sui) {
          return NextResponse.json({ error: "Address does not match signed-in identity" }, { status: 403, headers: NO_STORE_HEADERS });
        }
      } catch {
        return NextResponse.json({ error: "Invalid sui_address" }, { status: 400, headers: NO_STORE_HEADERS });
      }
    }
  } else if (body.sui_address?.trim()) {
    try {
      sui = normalizeSuiAddress(body.sui_address.trim());
    } catch {
      return NextResponse.json({ error: "Invalid sui_address" }, { status: 400, headers: NO_STORE_HEADERS });
    }
  } else {
    return NextResponse.json({ error: "sui_address required when database is not configured" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const token = await issueBrowserSessionToken(sui);
  if (!token) {
    return NextResponse.json({ error: "Session signing unavailable" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const res = NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  attachBrowserSessionCookie(res, token);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  res.cookies.set(BROWSER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
