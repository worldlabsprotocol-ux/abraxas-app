// FILE: lib/auth/ephemeralWallet/transientStatePolicy.ts
// When Abraxas uses process-local vs distributed transient state (Redis is optional).

import { isEphemeralRedisConfigured } from "./redisClient";
import { resolveEphemeralKvBackend } from "./redisKv";

export type TransientStateBackend = "process" | "redis";

export type EphemeralRevocationMode = "jwt_expiry_only" | "allowlist";

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

export function distributedReplayEnforced(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return resolveTransientStateBackend(env) === "redis";
}

export function resolveEphemeralRevocationMode(
  env: Record<string, string | undefined> = process.env,
): EphemeralRevocationMode {
  const raw = env.ABRAXAS_EPHEMERAL_REVOCATION?.trim().toLowerCase();
  if (raw === "allowlist") return "allowlist";
  return "jwt_expiry_only";
}

export function processTransientStateAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.NODE_ENV === "production" && env.ABRAXAS_EPHEMERAL_FORCE_MEMORY?.trim() === "1") {
    return false;
  }
  return resolveTransientStateBackend(env) === "process"
    || env.VITEST === "true"
    || env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST === "1";
}

export const TRANSIENT_STATE_AUDIT: ReadonlyArray<{
  feature: string;
  guarantee: string;
  required: boolean;
  backend: string;
  withoutSharedState: string;
}> = [
  {
    feature: "Sign-in challenge consume",
    guarantee: "Single-use sign-in authorization across concurrent verify attempts",
    required: true,
    backend: "process Map or Redis GETDEL",
    withoutSharedState:
      "Process-local only: replay possible across server instances until challenge TTL; fail closed if store unavailable.",
  },
  {
    feature: "Capability allowlist",
    guarantee: "Immediate logout invalidates captured capability JWT before natural expiry",
    required: false,
    backend: "Redis or process Map when ABRAXAS_EPHEMERAL_REVOCATION=allowlist",
    withoutSharedState:
      "Default jwt_expiry_only: logout clears cookie; captured JWT valid until exp (documented).",
  },
  {
    feature: "Sandbox workspace index",
    guarantee: "Session-scoped workspace continuity without personal account DB",
    required: false,
    backend: "process Map or Redis TTL",
    withoutSharedState: "Re-enter creates new workspace if index lost on cold start.",
  },
  {
    feature: "Sandbox test result cache",
    guarantee: "Independent validate endpoint can load issued test receipt by id",
    required: false,
    backend: "process Map or Redis TTL",
    withoutSharedState: "Validate still works with client-held receipt payload; cache is convenience.",
  },
];
