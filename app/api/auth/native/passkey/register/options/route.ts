// FILE: app/api/auth/native/passkey/register/options/route.ts

import { NextRequest, NextResponse } from "next/server";
import { beginPasskeyRegistration } from "@/lib/auth/webauthn/passkeyService";
import { resolveWebAuthnOrigin, resolveWebAuthnRpId } from "@/lib/auth/webauthn/rpConfig";
import { assertNativeAuthEnabled, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";
import { resolveAccountSession } from "@/lib/auth/accountSession";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const limited = await enforceNativeAuthRateLimit(req, "passkey_register_options", 30);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
  }

  const origin = resolveWebAuthnOrigin(req.headers.get("origin"), req.headers.get("host"));
  if (!origin) {
    return NextResponse.json({ ok: false, code: "origin_required" }, { status: 400 });
  }
  const rpId = resolveWebAuthnRpId(req.headers.get("host"));

  const existing = await resolveAccountSession(req);
  let body: { account_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const accountId = existing?.accountId ?? body.account_id ?? null;

  try {
    const result = await beginPasskeyRegistration({ accountId, origin, rpId });
    if (!result.ok) {
      if (result.code === "store_unavailable") {
        return NextResponse.json({ ok: false, code: result.code }, { status: 503 });
      }
      return NextResponse.json({ ok: false, code: result.code }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      challenge_id: result.challengeId,
      account_id: result.accountId,
      options: result.options,
    });
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
