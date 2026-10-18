// FILE: app/api/auth/native/enabled/route.ts

import { NextRequest, NextResponse } from "next/server";
import { assessNativeAuthProductionReadiness } from "@/lib/auth/nativeAccount/productionReadiness";
import { resolveNativeAuthOperational } from "@/lib/auth/nativeAccount/operational";
import { probeNativeAuthSchemaReady } from "@/lib/auth/nativeAccount/schemaReadiness";
import { probeSolanaAccountAuthSchemaReady } from "@/lib/auth/nativeAccount/solanaSchemaReadiness";
import { resolveSolanaAccountAuthOperational } from "@/lib/auth/nativeAccount/solanaOperational";
import { isNativeAccountDirectPostgresEnabled } from "@/lib/persistence/nativeAccountPg";
import { resolveWebAuthnOrigin, resolveWebAuthnRpId } from "@/lib/auth/webauthn/rpConfig";
import { isEphemeralWalletAuthEnabled } from "@/lib/auth/ephemeralWallet/featureFlag";
import { resolveEphemeralWalletAuthOperationalAsync } from "@/lib/auth/ephemeralWallet/operational";
import { getEphemeralRedisConfigState } from "@/lib/auth/ephemeralWallet/redisClient";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host");

  if (isEphemeralWalletAuthEnabled()) {
    const ephemeral = await resolveEphemeralWalletAuthOperationalAsync();
    return NextResponse.json({
      ok: true,
      auth_mode: "ephemeral_wallet",
      enabled: ephemeral.flag_enabled,
      operational: ephemeral.operational,
      passkey_operational: false,
      solana_operational: ephemeral.operational,
      connect_mode: ephemeral.operational
        ? "solana_wallet"
        : ephemeral.flag_enabled
          ? "unavailable"
          : "explore",
      degraded_reason: ephemeral.degraded_reason,
      persistence: {
        personal_account_database: false,
        ephemeral_state: getEphemeralRedisConfigState(),
        state_backend: ephemeral.state_backend,
      },
      ephemeral_security: {
        challenge_replay_backend: ephemeral.challenge_replay_backend,
        distributed_replay_enforced: ephemeral.distributed_replay_enforced,
        production_activation_blocked: ephemeral.production_activation_blocked,
        missing_capability: ephemeral.missing_capability,
        revocation_mode: ephemeral.revocation_mode,
      },
      webauthn: {
        rp_id: resolveWebAuthnRpId(host),
        rp_id_from_env: Boolean(process.env.ABRAXAS_WEBAUTHN_RP_ID?.trim()),
        origin: resolveWebAuthnOrigin(req.headers.get("origin"), host),
      },
    });
  }

  const schema = await probeNativeAuthSchemaReady();
  const solanaSchema = await probeSolanaAccountAuthSchemaReady();
  const readiness = assessNativeAuthProductionReadiness({ schema, hostHeader: host });
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
    },
    webauthn: {
      rp_id: resolveWebAuthnRpId(host),
      rp_id_from_env: Boolean(process.env.ABRAXAS_WEBAUTHN_RP_ID?.trim()),
      origin: resolveWebAuthnOrigin(req.headers.get("origin"), host),
    },
  });
}
