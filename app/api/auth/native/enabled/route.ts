// FILE: app/api/auth/native/enabled/route.ts

import { NextRequest, NextResponse } from "next/server";
import { assessNativeAuthProductionReadiness } from "@/lib/auth/nativeAccount/productionReadiness";
import { resolveNativeAuthOperational } from "@/lib/auth/nativeAccount/operational";
import { probeNativeAuthSchemaReady } from "@/lib/auth/nativeAccount/schemaReadiness";
import { isNativeAccountDirectPostgresEnabled } from "@/lib/persistence/nativeAccountPg";
import { resolveWebAuthnOrigin, resolveWebAuthnRpId } from "@/lib/auth/webauthn/rpConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const schema = await probeNativeAuthSchemaReady();
  const readiness = assessNativeAuthProductionReadiness({ schema, hostHeader: host });
  const operational = resolveNativeAuthOperational({ schema });
  return NextResponse.json({
    ok: true,
    enabled: operational.flag_enabled,
    operational: operational.operational,
    connect_mode: operational.operational
      ? "native_passkey"
      : operational.flag_enabled
        ? "unavailable"
        : "explore",
    degraded_reason: operational.degraded_reason,
    runtime: readiness.diagnostics,
    schema,
    persistence: {
      backend: readiness.persistence_backend,
      native_account_direct_pg: isNativeAccountDirectPostgresEnabled(),
    },
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
