// FILE: app/api/auth/zklogin/login-state/route.ts
// Mint signed single-use OAuth state for zkLogin (binds login mode server-side).

import { NextRequest, NextResponse } from "next/server";
import {
  attachZkLoginOAuthStateCookie,
  mintZkLoginOAuthState,
} from "@/lib/sui/zklogin/oauthLoginState";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

  if (body.holder_platform === "android_native" || body.holder_platform === "ios_native") {
    const pending = body.pending;
    if (
      pending?.ephemeralSecretKey
      && pending?.randomness
      && typeof pending.maxEpoch === "number"
      && pending.provider === "google"
    ) {
      const { saveNativeZkLoginPending } = await import("@/lib/sui/zklogin/nativePendingStore");
      const stored = await saveNativeZkLoginPending({
        jti: minted.jti,
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
        return NextResponse.json({ error: "Native sign-in unavailable" }, { status: 503 });
      }
    }
  }

  const res = NextResponse.json({ oauth_state: minted.oauthState });
  attachZkLoginOAuthStateCookie(res, minted.jti);
  return res;
}
