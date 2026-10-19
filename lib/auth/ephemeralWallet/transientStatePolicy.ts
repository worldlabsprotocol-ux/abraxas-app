// FILE: lib/auth/ephemeralWallet/transientStatePolicy.ts
// When Abraxas uses process-local vs distributed transient state (Redis is optional).

import { isEphemeralRedisConfigured } from "./redisClient";
import { resolveEphemeralKvBackend } from "./redisKv";

export type TransientStateBackend = "process" | "redis";

export type EphemeralRevocationMode = "jwt_expiry_only" | "allowlist";

/** Vercel / Production runtimes are distributed; process Maps are not authoritative for consume-once. */
export function isDistributedProductionEnvironment(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const vercel = env.VERCEL_ENV?.trim().toLowerCase();
  if (vercel === "production" || vercel === "preview") return true;
  return env.NODE_ENV === "production";
}

export function resolveTransientStateBackend(
  env: Record<string, string | undefined> = process.env,
): TransientStateBackend {
  const forced = env.ABRAXAS_EPHEMERAL_TRANSIENT_BACKEND?.trim().toLowerCase();
  if (forced === "process") return "process";
  if (forced === "redis") return "redis";
  if (isEphemeralRedisConfigured(env) || resolveEphemeralKvBackend(env) === "tcp") {
    return "redis";
  }
  return "process";
}

/** Authoritative atomic challenge consume (GETDEL) for sign-in and action auth. */
export function authoritativeChallengeReplayBackend(
  env: Record<string, string | undefined> = process.env,
): TransientStateBackend | "none" {
  if (isDistributedProductionEnvironment(env)) {
    return isEphemeralRedisConfigured(env) || resolveEphemeralKvBackend(env) === "tcp"
      ? "redis"
      : "none";
  }
  const backend = resolveTransientStateBackend(env);
  return backend;
}

export function distributedReplayEnforced(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return authoritativeChallengeReplayBackend(env) === "redis";
}

export function requiresDistributedChallengeStore(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return isDistributedProductionEnvironment(env);
}

export function resolveEphemeralRevocationMode(
  env: Record<string, string | undefined> = process.env,
): EphemeralRevocationMode {
  const raw = env.ABRAXAS_EPHEMERAL_REVOCATION?.trim().toLowerCase();
  if (raw === "allowlist") return "allowlist";
  return "jwt_expiry_only";
}

/** Process-local challenge Maps — local dev and isolated CI only, never distributed Production. */
export function processChallengeStoreAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (requiresDistributedChallengeStore(env)) return false;
  if (env.ABRAXAS_EPHEMERAL_FORCE_MEMORY?.trim() === "1") return false;
  return (
    resolveTransientStateBackend(env) === "process"
    || env.VITEST === "true"
    || env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST === "1"
  );
}

export function processTransientStateAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (requiresDistributedChallengeStore(env)) {
    return false;
  }
  if (env.ABRAXAS_EPHEMERAL_FORCE_MEMORY?.trim() === "1") {
    return false;
  }
  return (
    resolveTransientStateBackend(env) === "process"
    || env.VITEST === "true"
    || env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST === "1"
  );
}

export function missingDistributedReplayCapability(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (!isEphemeralWalletAuthEnabledCheck(env)) return null;
  if (!requiresDistributedChallengeStore(env)) return null;
  if (authoritativeChallengeReplayBackend(env) === "redis") return null;
  return "distributed_replay_not_configured";
}

function isEphemeralWalletAuthEnabledCheck(env: Record<string, string | undefined>): boolean {
  const raw = env.ABRAXAS_EPHEMERAL_WALLET_AUTH?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "enabled";
}

export const TRANSIENT_STATE_AUDIT: ReadonlyArray<{
  feature: string;
  guarantee: string;
  required: boolean;
  backend: string;
  withoutSharedState: string;
}> = [
  {
    feature: "Sign-in / action challenge consume",
    guarantee: "Single-use authorization across concurrent verify attempts and server instances",
    required: true,
    backend: "Redis GETDEL (Production); process Map (local dev / isolated tests only)",
    withoutSharedState:
      "Distributed Production without Redis: protected auth unavailable (fail closed). No silent downgrade.",
  },
  {
    feature: "Sandbox presentation commit consume",
    guarantee:
      "Single-use holder presentation binding across concurrent test-verify attempts and Vercel instances (same backend as challenge replay)",
    required: true,
    backend: "Redis GETDEL (Production / Preview); process Map with in-process lock (local dev / isolated tests only)",
    withoutSharedState:
      "Distributed Production without Redis: sandbox age test presentation unavailable (fail closed). Hash binding alone does not establish issuer trust or current eligibility.",
  },
  {
    feature: "Capability allowlist",
    guarantee: "Immediate logout invalidates captured capability JWT before natural expiry",
    required: false,
    backend: "Redis or process Map when ABRAXAS_EPHEMERAL_REVOCATION=allowlist (process not valid in distributed Production)",
    withoutSharedState:
      "Default jwt_expiry_only: logout clears cookie; captured JWT valid until exp (documented).",
  },
  {
    feature: "Sandbox workspace index",
    guarantee: "Session-scoped workspace continuity without personal account DB",
    required: false,
    backend: "Redis TTL in Production; process Map in local dev",
    withoutSharedState: "Re-enter may create new workspace; cryptographic action auth still enforced.",
  },
  {
    feature: "Sandbox test result cache",
    guarantee: "Independent validate endpoint can load issued test receipt by id",
    required: false,
    backend: "Redis TTL or process Map",
    withoutSharedState: "Validate works from client-held receipt; cache is convenience.",
  },
];
