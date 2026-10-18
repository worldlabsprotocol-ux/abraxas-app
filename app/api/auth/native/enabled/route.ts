// FILE: app/api/auth/native/enabled/route.ts

import { NextRequest, NextResponse } from "next/server";
import { assessNativeAuthProductionReadiness } from "@/lib/auth/nativeAccount/productionReadiness";
import { resolveNativeAuthOperational } from "@/lib/auth/nativeAccount/operational";
import { probeNativeAuthSchemaReady } from "@/lib/auth/nativeAccount/schemaReadiness";
import { probeSolanaAccountAuthSchemaReady } from "@/lib/auth/nativeAccount/solanaSchemaReadiness";
import { resolveSolanaAccountAuthOperational } from "@/lib/auth/nativeAccount/solanaOperational";
import { isNativeAccountDirectPostgresEnabled } from "@/lib/persistence/nativeAccountPg";
import { resolveWebAuthnOrigin, resolveWebAuthnRpId } from "@/lib/auth/webauthn/rpConfig";
import { buildNativeAuthOperatorActions } from "@/lib/auth/nativeAccount/operatorActions";
import { resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const schema = await probeNativeAuthSchemaReady();
  const solanaSchema = await probeSolanaAccountAuthSchemaReady();
  const readiness = assessNativeAuthProductionReadiness({
    schema,
    solanaSchema: solanaSchema,
    hostHeader: host,
  });
  const operational = resolveNativeAuthOperational({ schema });
  const solanaOperational = resolveSolanaAccountAuthOperational({ schema: solanaSchema });
  const publicOperational = solanaOperational.operational;
  return NextResponse.json({
    ok: true,
    enabled: solanaOperational.flag_enabled,
    operational: publicOperational,
    passkey_operational: operational.operational,
    solana_operational: solanaOperational.operational,
    connect_mode: publicOperational
      ? "solana_wallet"
      : solanaOperational.flag_enabled
        ? "unavailable"
        : "explore",
    degraded_reason: solanaOperational.degraded_reason ?? operational.degraded_reason,
    solana_schema: solanaSchema,
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
      operator_actions: buildNativeAuthOperatorActions(readiness.blockers),
    },
    solana_network: resolveAuthorizedSolanaNetworkFromEnv(),
    webauthn: {
      rp_id: resolveWebAuthnRpId(host),
      rp_id_from_env: Boolean(process.env.ABRAXAS_WEBAUTHN_RP_ID?.trim()),
      origin: resolveWebAuthnOrigin(req.headers.get("origin"), host),
    },
  });
}
