// FILE: app/api/auth/wallet/enabled/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveEphemeralWalletAuthOperationalAsync } from "@/lib/auth/ephemeralWallet/operational";
import { validateEphemeralWalletRuntimeConfig } from "@/lib/auth/ephemeralWallet/configValidation";
import { isEphemeralWalletAuthEnabled } from "@/lib/auth/ephemeralWallet/featureFlag";
import { resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";
import { getEphemeralRedisConfigState } from "@/lib/auth/ephemeralWallet/redisClient";
import { defaultEphemeralWalletScopes } from "@/lib/auth/ephemeralWallet/scopes";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const op = await resolveEphemeralWalletAuthOperationalAsync();
  const config = validateEphemeralWalletRuntimeConfig();
  return NextResponse.json({
    ok: true,
    auth_mode: "ephemeral_wallet",
    enabled: op.flag_enabled,
    operational: op.operational,
    connect_mode: op.operational ? "solana_wallet" : op.flag_enabled ? "unavailable" : "explore",
    degraded_reason: op.degraded_reason,
    solana_network: resolveAuthorizedSolanaNetworkFromEnv(),
    scopes: defaultEphemeralWalletScopes(),
    persistence: {
      personal_account_database: false,
      ephemeral_state: getEphemeralRedisConfigState(),
      state_backend: op.state_backend,
    },
    config_ok: config.ok,
    config_code: config.ok ? null : config.code,
    flag_enabled: isEphemeralWalletAuthEnabled(),
  });
}
