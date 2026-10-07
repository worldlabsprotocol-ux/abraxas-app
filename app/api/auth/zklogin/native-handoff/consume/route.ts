// FILE: app/api/auth/zklogin/native-handoff/consume/route.ts
// Bind a native holder handoff code + WebView verifier to the in-app browser session.

import { NextRequest, NextResponse } from "next/server";
import { attachBrowserSessionCookie, issueBrowserSessionToken } from "@/lib/auth/browserSession";
import { verifyAndConsumeNativeHandoffCode } from "@/lib/sui/zklogin/nativeHandoff";
import { checkNativeAuthRateLimit } from "@/lib/sui/zklogin/nativeAuthRateLimit";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await checkNativeAuthRateLimit(req, "handoff-consume", 20);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts" },
      { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    handoff_code?: string;
    consume_verifier?: string;
  };

  const handoff = await verifyAndConsumeNativeHandoffCode(
    body.handoff_code,
    body.consume_verifier,
  );
  if (!handoff) {
    return NextResponse.json({ error: "Invalid or expired handoff" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let email = handoff.email;
  if (sbUrl && sbKey) {
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    const { data } = await sb
      .from("sui_zklogin_identities")
      .select("email")
      .eq("sui_address", handoff.suiAddress)
      .maybeSingle();
    if (typeof data?.email === "string" && data.email.includes("@")) {
      email = data.email;
    }
  }

  const token = await issueBrowserSessionToken(handoff.suiAddress);
  if (!token) {
    return NextResponse.json({ error: "Session signing unavailable" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const res = NextResponse.json(
    {
      ok: true,
      sui_address: normalizeSuiAddress(handoff.suiAddress),
      email: email ?? null,
      provider: handoff.provider,
      oauth_sub: handoff.oauthSub,
      max_epoch: handoff.maxEpoch,
      user_salt: handoff.userSalt,
      randomness: handoff.randomness,
      ephemeral_secret_key: handoff.ephemeralSecretKey,
      login_mode: handoff.loginMode,
      id_token: handoff.idToken,
    },
    { headers: NO_STORE_HEADERS },
  );
  attachBrowserSessionCookie(res, token);
  return res;
}
