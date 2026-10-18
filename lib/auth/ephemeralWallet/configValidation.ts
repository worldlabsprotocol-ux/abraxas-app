// FILE: lib/auth/ephemeralWallet/configValidation.ts

import { resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";
import { isEphemeralWalletAuthEnabled } from "./featureFlag";
import { isEphemeralRedisConfigured } from "./redisClient";

export type EphemeralWalletConfigState =
  | { ok: true }
  | {
      ok: false;
      code:
        | "disabled"
        | "session_secret_missing"
        | "solana_network_not_configured"
        | "ephemeral_state_not_configured"
        | "memory_forbidden_in_production";
    };

export function validateEphemeralWalletRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): EphemeralWalletConfigState {
  if (!isEphemeralWalletAuthEnabled(env)) {
    return { ok: false, code: "disabled" };
  }

  if (env.NODE_ENV === "production") {
    const memory = env.ABRAXAS_EPHEMERAL_FORCE_MEMORY?.trim().toLowerCase();
    if (memory === "1" || memory === "true") {
      return { ok: false, code: "memory_forbidden_in_production" };
    }
    if (!isEphemeralRedisConfigured(env)) {
      return { ok: false, code: "ephemeral_state_not_configured" };
    }
  }

  const secret =
    env.ABRAXAS_ACCOUNT_SESSION_SECRET?.trim()
    || env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    || env.ABRAXAS_SIGNING_KEY?.trim();
  if (!secret || secret.length < 32) {
    return { ok: false, code: "session_secret_missing" };
  }

  if (!resolveAuthorizedSolanaNetworkFromEnv()) {
    return { ok: false, code: "solana_network_not_configured" };
  }

  if (env.NODE_ENV === "production" && !isEphemeralRedisConfigured(env)) {
    return { ok: false, code: "ephemeral_state_not_configured" };
  }

  if (
    env.NODE_ENV !== "production"
    && !isEphemeralRedisConfigured(env)
    && env.VITEST !== "true"
    && env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST !== "1"
  ) {
    return { ok: false, code: "ephemeral_state_not_configured" };
  }

  return { ok: true };
}
