// FILE: app/api/auth/browser-session/route.ts
// Mint httpOnly browser session after verified zkLogin — used by first-party flows.

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { createClient } from "@supabase/supabase-js";
import {
  attachBrowserSessionCookie,
  BROWSER_SESSION_COOKIE,
  issueBrowserSessionToken,
} from "@/lib/auth/browserSession";
import { verifyGoogleZkLoginIdToken } from "@/lib/auth/verifyZkLoginIdToken";
import {
  mapZkLoginVerificationFailure,
  ZKLOGIN_ERROR_CODES,
} from "@/lib/sui/zklogin/zkloginErrorCodes";
import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    sui_address?: string;
    id_token?: string;
    oauth_sub?: string;
  };

  const idToken = body.id_token?.trim();
  if (!idToken) {
    return NextResponse.json({ error: "id_token required" }, { status: 400 });
  }

  let verified;
  try {
    verified = await verifyGoogleZkLoginIdToken(idToken, body.oauth_sub?.trim());
  } catch (e) {
    const mapped = mapZkLoginVerificationFailure(e);
    const message = mapped.code === ZKLOGIN_ERROR_CODES.untrustedAudience
      ? ZKLOGIN_SIGN_IN_COPY.errors.untrustedAudience
      : ZKLOGIN_SIGN_IN_COPY.errors.invalidToken;
    return NextResponse.json({ error: message, code: mapped.code }, { status: 401 });
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
      return NextResponse.json({ error: "Account not registered" }, { status: 403 });
    }

    sui = normalizeSuiAddress(data.sui_address);

    if (body.sui_address?.trim()) {
      try {
        const requested = normalizeSuiAddress(body.sui_address.trim());
        if (requested !== sui) {
          return NextResponse.json({ error: "Address does not match signed-in identity" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid sui_address" }, { status: 400 });
      }
    }
  } else if (body.sui_address?.trim()) {
    try {
      sui = normalizeSuiAddress(body.sui_address.trim());
    } catch {
      return NextResponse.json({ error: "Invalid sui_address" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "sui_address required when database is not configured" }, { status: 400 });
  }

  const token = await issueBrowserSessionToken(sui);
  if (!token) {
    return NextResponse.json({
      error: ZKLOGIN_SIGN_IN_COPY.errors.sessionMintFailed,
      code: ZKLOGIN_ERROR_CODES.sessionMintFailed,
    }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true, sui_address: sui });
  attachBrowserSessionCookie(res, token);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BROWSER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
