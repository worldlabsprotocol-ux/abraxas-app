// FILE: app/api/auth/native/enabled/route.ts

import { NextRequest, NextResponse } from "next/server";
import { isNativeAccountAuthEnabled } from "@/lib/auth/nativeAccount/featureFlag";
import { assessNativeAuthProductionReadiness } from "@/lib/auth/nativeAccount/productionReadiness";
import { probeNativeAuthSchemaReady } from "@/lib/auth/nativeAccount/schemaReadiness";
import { resolveWebAuthnOrigin, resolveWebAuthnRpId } from "@/lib/auth/webauthn/rpConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const schema = await probeNativeAuthSchemaReady();
  const readiness = assessNativeAuthProductionReadiness({ schema, hostHeader: host });
  return NextResponse.json({
    ok: true,
    enabled: isNativeAccountAuthEnabled(),
    runtime: readiness.diagnostics,
    schema,
    production_readiness: {
      persistence_backend: readiness.persistence_backend,
      blockers: readiness.blockers,
      rollback: readiness.rollback,
    },
    webauthn: {
      rp_id: resolveWebAuthnRpId(host),
      rp_id_from_env: Boolean(process.env.ABRAXAS_WEBAUTHN_RP_ID?.trim()),
      origin: resolveWebAuthnOrigin(req.headers.get("origin"), host),
    },
  });
}
