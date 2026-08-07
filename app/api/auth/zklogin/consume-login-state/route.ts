// FILE: app/api/auth/zklogin/consume-login-state/route.ts
// Verify and consume single-use OAuth state — returns trusted login_mode only.

import { NextRequest, NextResponse } from "next/server";
import {
  clearZkLoginOAuthStateCookie,
  consumeZkLoginOAuthState,
  ZKLOGIN_OAUTH_STATE_COOKIE,
  ZKLOGIN_SIGN_IN_EXPIRED_MESSAGE,
} from "@/lib/sui/zklogin/oauthLoginState";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { oauth_state?: string };
  const cookieJti = req.cookies.get(ZKLOGIN_OAUTH_STATE_COOKIE)?.value ?? null;

  const result = await consumeZkLoginOAuthState(body.oauth_state, cookieJti);
  if (!result.ok) {
    const res = NextResponse.json(
      { error: ZKLOGIN_SIGN_IN_EXPIRED_MESSAGE, code: "zklogin_sign_in_expired" },
      { status: 401 },
    );
    clearZkLoginOAuthStateCookie(res);
    return res;
  }

  const res = NextResponse.json({ login_mode: result.mode });
  clearZkLoginOAuthStateCookie(res);
  return res;
}
