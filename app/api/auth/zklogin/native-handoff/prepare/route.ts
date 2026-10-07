// FILE: app/api/auth/zklogin/native-handoff/prepare/route.ts
// Complete native external-browser zkLogin and mint an opaque WebView handoff code.

import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "@mysten/sui/zklogin";
import {
  clearNativeZkLoginPending,
  loadNativeConsumeVerifierHash,
  loadNativeZkLoginPending,
} from "@/lib/sui/zklogin/nativePendingStore";
import { mintNativeHandoffCode } from "@/lib/sui/zklogin/nativeHandoff";
import {
  consumeZkLoginOAuthState,
  inspectZkLoginOAuthState,
  parseOAuthStateFromCallbackHash,
} from "@/lib/sui/zklogin/oauthLoginState";
import { verifyNativeOAuthNonce } from "@/lib/sui/zklogin/verifyNativeOAuthNonce";
import { checkNativeAuthRateLimit } from "@/lib/sui/zklogin/nativeAuthRateLimit";
import { SITE_URL } from "@/lib/siteUrl";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await checkNativeAuthRateLimit(req, "handoff-prepare", 20);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts" },
      { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    id_token?: string;
    oauth_state?: string;
    callback_hash?: string;
  };

  const idToken = body.id_token?.trim();
  if (!idToken) {
    return NextResponse.json({ error: "id_token required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const oauthState = body.oauth_state?.trim()
    ?? (body.callback_hash ? parseOAuthStateFromCallbackHash(body.callback_hash) : null);
  if (!oauthState) {
    return NextResponse.json({ error: "oauth_state required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const inspected = await inspectZkLoginOAuthState(oauthState);
  if (!inspected?.holderPlatform) {
    return NextResponse.json({ error: "not_native_flow" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const consumed = await consumeZkLoginOAuthState(oauthState, null);
  if (!consumed.ok || !consumed.holderPlatform) {
    return NextResponse.json({ error: "Sign-in expired" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const pending = await loadNativeZkLoginPending(consumed.jti);
  const consumeVerifierHash = await loadNativeConsumeVerifierHash(consumed.jti);
  if (!pending || !consumeVerifierHash) {
    return NextResponse.json({ error: "Native sign-in context expired" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  if (!verifyNativeOAuthNonce(idToken, pending)) {
    return NextResponse.json({ error: "Sign-in expired" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const decoded = decodeJwt(idToken);
  const sub = decoded.sub;
  if (!sub) {
    return NextResponse.json({ error: "Invalid OAuth token" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const registerRes = await fetch(`${SITE_URL.replace(/\/$/, "")}/api/auth/zklogin/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_token: idToken,
      provider: pending.provider,
      oauth_sub: sub,
      max_epoch: pending.maxEpoch,
      login_mode: consumed.mode,
    }),
  });

  const registerData = (await registerRes.json().catch(() => ({}))) as {
    sui_address?: string;
    email?: string | null;
    user_salt?: string;
    error?: string;
    code?: string;
  };

  if (!registerRes.ok || !registerData.sui_address || !registerData.user_salt) {
    return NextResponse.json(
      { error: registerData.error ?? "Registration failed", code: registerData.code },
      { status: registerRes.status || 400, headers: NO_STORE_HEADERS },
    );
  }

  const handoffCode = await mintNativeHandoffCode({
    oauthJti: consumed.jti,
    consumeVerifierHash,
    payload: {
      suiAddress: registerData.sui_address,
      email: registerData.email ?? undefined,
      provider: pending.provider,
      oauthSub: sub,
      maxEpoch: pending.maxEpoch,
      userSalt: registerData.user_salt,
      ephemeralSecretKey: pending.ephemeralSecretKey,
      randomness: pending.randomness,
      loginMode: consumed.mode,
      idToken,
    },
  });

  await clearNativeZkLoginPending(consumed.jti);

  if (!handoffCode) {
    return NextResponse.json({ error: "Handoff unavailable" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    {
      ok: true,
      handoff_code: handoffCode,
    },
    { headers: NO_STORE_HEADERS },
  );
}
