// FILE: app/api/auth/native/passkey/authenticate/options/route.ts

import { NextRequest, NextResponse } from "next/server";
import { beginPasskeyAuthentication } from "@/lib/auth/webauthn/passkeyService";
import { resolveWebAuthnOrigin, resolveWebAuthnRpId } from "@/lib/auth/webauthn/rpConfig";
import { assertNativeAuthEnabled, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const limited = await enforceNativeAuthRateLimit(req, "passkey_auth_options", 30);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
  }

  const origin = resolveWebAuthnOrigin(req.headers.get("origin"), req.headers.get("host"));
  if (!origin) {
    return NextResponse.json({ ok: false, code: "origin_required" }, { status: 400 });
  }
  const rpId = resolveWebAuthnRpId(req.headers.get("host"));

  try {
    const result = await beginPasskeyAuthentication({ origin, rpId });
    if (!result.ok) {
      return NextResponse.json({ ok: false, code: result.code }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      challenge_id: result.challengeId,
      options: result.options,
    });
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
