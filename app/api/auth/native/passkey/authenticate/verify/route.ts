// FILE: app/api/auth/native/passkey/authenticate/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { finishPasskeyAuthentication } from "@/lib/auth/webauthn/passkeyService";
import { resolveWebAuthnOrigin, resolveWebAuthnRpId } from "@/lib/auth/webauthn/rpConfig";
import { attachAccountSessionCookie, issueAccountSessionToken } from "@/lib/auth/accountSession";
import { assertNativeAuthOperational, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const disabled = await assertNativeAuthOperational();
  if (disabled) return disabled;

  const limited = await enforceNativeAuthRateLimit(req, "passkey_auth_verify", 20);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
  }

  const origin = resolveWebAuthnOrigin(req.headers.get("origin"), req.headers.get("host"));
  if (!origin) {
    return NextResponse.json({ ok: false, code: "origin_required" }, { status: 400 });
  }
  const rpId = resolveWebAuthnRpId(req.headers.get("host"));

  let body: { challenge_id?: string; response?: AuthenticationResponseJSON };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_json" }, { status: 400 });
  }

  const challengeId = String(body.challenge_id ?? "");
  if (!challengeId || !body.response) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  try {
    const result = await finishPasskeyAuthentication({
      challengeId,
      origin,
      rpId,
      response: body.response,
    });
    if (!result.ok) {
      const status = result.code.includes("expired") ? 410 : 401;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }

    const token = await issueAccountSessionToken(result.accountId);
    if (!token) {
      return NextResponse.json({ ok: false, code: "session_unavailable" }, { status: 503 });
    }

    const res = NextResponse.json({
      ok: true,
      account_id: result.accountId,
      authenticated: true,
    });
    attachAccountSessionCookie(res, token);
    return res;
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
