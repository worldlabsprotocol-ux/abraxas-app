// FILE: app/api/auth/zklogin/login-state/route.ts
// Mint signed single-use OAuth state for zkLogin (binds login mode server-side).

import { NextRequest, NextResponse } from "next/server";
import {
  attachZkLoginOAuthStateCookie,
  mintZkLoginOAuthState,
} from "@/lib/sui/zklogin/oauthLoginState";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { login_mode?: string };
  const minted = await mintZkLoginOAuthState(body.login_mode);
  if (!minted) {
    return NextResponse.json({ error: "Sign-in unavailable" }, { status: 503 });
  }

  const res = NextResponse.json({ oauth_state: minted.oauthState });
  attachZkLoginOAuthStateCookie(res, minted.jti);
  return res;
}
