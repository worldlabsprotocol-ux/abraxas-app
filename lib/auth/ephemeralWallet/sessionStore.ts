// FILE: lib/auth/ephemeralWallet/sessionStore.ts

import { isEphemeralRedisConfigured } from "./redisClient";
import { ephemeralKvDel, ephemeralKvGet, ephemeralKvSet, resolveEphemeralKvBackend } from "./redisKv";
import { EphemeralStateUnavailableError } from "./errors";

const ACTIVE_PREFIX = "abraxas:ephemeral:wallet-session:active:v1:";

const memoryActive = new Map<string, number>();

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  if (env.NODE_ENV === "production") return false;
  return env.VITEST === "true" || env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST === "1";
}

function activeKey(sessionId: string): string {
  return `${ACTIVE_PREFIX}${sessionId}`;
}

export async function registerEphemeralWalletSessionActive(
  sessionId: string,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  if (resolveEphemeralKvBackend(env) !== "none") {
    await ephemeralKvSet(activeKey(sessionId), "1", ttlSec, env);
    return;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  memoryActive.set(sessionId, Date.now() + ttlSec * 1000);
}

export async function isEphemeralWalletSessionActive(
  sessionId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  if (resolveEphemeralKvBackend(env) !== "none") {
    const v = await ephemeralKvGet<string | number>(activeKey(sessionId), env);
    return v === "1" || v === 1;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  const exp = memoryActive.get(sessionId);
  if (!exp) return false;
  if (exp <= Date.now()) {
    memoryActive.delete(sessionId);
    return false;
  }
  return true;
}

export async function revokeEphemeralWalletSession(
  sessionId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  if (resolveEphemeralKvBackend(env) !== "none") {
    const n = await ephemeralKvDel(activeKey(sessionId), env);
    return n > 0;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  return memoryActive.delete(sessionId);
}

export function resetEphemeralSessionStoreForTests(): void {
  memoryActive.clear();
}

export async function probeEphemeralSessionStore(
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: boolean; code: string | null }> {
  if (isEphemeralRedisConfigured(env) || resolveEphemeralKvBackend(env) === "tcp") {
    return { ok: true, code: null };
  }
  if (memoryAllowed(env)) return { ok: true, code: "memory_test_only" };
  return { ok: false, code: "ephemeral_state_not_configured" };
}
