// FILE: app/api/auth/zklogin/login-state/route.ts
// Mint signed single-use OAuth state for zkLogin (binds login mode server-side).

import { NextRequest, NextResponse } from "next/server";
import {
  attachZkLoginOAuthStateCookie,
  mintZkLoginOAuthState,
} from "@/lib/sui/zklogin/oauthLoginState";
import {
  checkNativeAuthRateLimit,
} from "@/lib/sui/zklogin/nativeAuthRateLimit";
import {
  mintNativeConsumeVerifier,
} from "@/lib/sui/zklogin/nativePendingStore";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

export async function POST(req: NextRequest) {
  const limited = await checkNativeAuthRateLimit(req, "login-state", 30);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts" },
      { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(limited.retryAfterSec) } },
    );
  }
  const body = (await req.json().catch(() => ({}))) as {
    login_mode?: string;
    holder_platform?: string;
    pending?: {
      ephemeralSecretKey?: string;
      randomness?: string;
      maxEpoch?: number;
      provider?: string;
      loginMode?: string;
      startedAt?: string;
    };
  };

  const minted = await mintZkLoginOAuthState(body.login_mode, body.holder_platform);
  if (!minted) {
    return NextResponse.json({ error: "Sign-in unavailable" }, { status: 503 });
  }

  let nativeConsumeVerifier: string | undefined;
  if (body.holder_platform === "android_native" || body.holder_platform === "ios_native") {
    const pending = body.pending;
    if (
      pending?.ephemeralSecretKey
      && pending?.randomness
      && typeof pending.maxEpoch === "number"
      && pending.provider === "google"
    ) {
      nativeConsumeVerifier = mintNativeConsumeVerifier();
      const { saveNativeZkLoginPending } = await import("@/lib/sui/zklogin/nativePendingStore");
      const stored = await saveNativeZkLoginPending({
        jti: minted.jti,
        consumeVerifier: nativeConsumeVerifier,
        session: {
          ephemeralSecretKey: pending.ephemeralSecretKey,
          randomness: pending.randomness,
          maxEpoch: pending.maxEpoch,
          provider: "google",
          loginMode: pending.loginMode === "legacy_recovery" ? "legacy_recovery" : "canonical",
          startedAt: pending.startedAt ?? new Date().toISOString(),
        },
      });
      if (!stored) {
        return NextResponse.json({ error: "Native sign-in unavailable" }, { status: 503, headers: NO_STORE_HEADERS });
      }
    }
  }

  const res = NextResponse.json({
    oauth_state: minted.oauthState,
    ...(nativeConsumeVerifier ? { native_consume_verifier: nativeConsumeVerifier } : {}),
  }, { headers: NO_STORE_HEADERS });
  attachZkLoginOAuthStateCookie(res, minted.jti);
  return res;
}
