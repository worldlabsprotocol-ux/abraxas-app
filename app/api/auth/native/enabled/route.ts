// FILE: app/api/auth/native/enabled/route.ts

import { NextRequest, NextResponse } from "next/server";
import { isNativeAccountAuthEnabled } from "@/lib/auth/nativeAccount/featureFlag";
import { getNativeAuthRuntimeDiagnostics } from "@/lib/auth/nativeAccount/runtimeDiagnostics";
import { resolveWebAuthnOrigin, resolveWebAuthnRpId } from "@/lib/auth/webauthn/rpConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const diagnostics = getNativeAuthRuntimeDiagnostics();
  const host = req.headers.get("host");
  return NextResponse.json({
    ok: true,
    enabled: isNativeAccountAuthEnabled(),
    runtime: diagnostics,
    webauthn: {
      rp_id: resolveWebAuthnRpId(host),
      origin: resolveWebAuthnOrigin(req.headers.get("origin"), host),
    },
  });
}
