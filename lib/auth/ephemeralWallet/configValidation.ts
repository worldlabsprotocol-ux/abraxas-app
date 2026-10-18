// FILE: lib/auth/ephemeralWallet/configValidation.ts

import { resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";
import { isEphemeralWalletAuthEnabled } from "./featureFlag";
import {
  authoritativeChallengeReplayBackend,
  isDistributedProductionEnvironment,
  resolveTransientStateBackend,
} from "./transientStatePolicy";

export type EphemeralWalletConfigState =
  | { ok: true }
  | {
      ok: false;
      code:
        | "disabled"
        | "session_secret_missing"
        | "solana_network_not_configured"
        | "ephemeral_state_not_configured"
        | "memory_forbidden_in_production"
        | "distributed_replay_not_configured"
        | "process_backend_forbidden_in_production";
    };

export function validateEphemeralWalletRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): EphemeralWalletConfigState {
  if (!isEphemeralWalletAuthEnabled(env)) {
    return { ok: false, code: "disabled" };
  }

  if (isDistributedProductionEnvironment(env)) {
    const forcedProcess = env.ABRAXAS_EPHEMERAL_TRANSIENT_BACKEND?.trim().toLowerCase() === "process";
    if (forcedProcess) {
      return { ok: false, code: "process_backend_forbidden_in_production" };
    }
    const memory = env.ABRAXAS_EPHEMERAL_FORCE_MEMORY?.trim().toLowerCase();
    if (memory === "1" || memory === "true") {
      return { ok: false, code: "memory_forbidden_in_production" };
    }
    if (authoritativeChallengeReplayBackend(env) !== "redis") {
      return { ok: false, code: "distributed_replay_not_configured" };
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

  const backend = resolveTransientStateBackend(env);
  if (backend !== "process" && backend !== "redis") {
    return { ok: false, code: "ephemeral_state_not_configured" };
  }

  if (
    backend === "redis"
    && isDistributedProductionEnvironment(env)
    && !env.UPSTASH_REDIS_REST_URL?.trim()
    && !env.ABRAXAS_EPHEMERAL_REDIS_URL?.trim()
  ) {
    return { ok: false, code: "ephemeral_state_not_configured" };
  }

  return { ok: true };
}
