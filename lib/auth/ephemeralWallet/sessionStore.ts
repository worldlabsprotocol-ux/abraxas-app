// FILE: lib/auth/ephemeralWallet/sessionStore.ts

import { getEphemeralRedis, isEphemeralRedisConfigured } from "./redisClient";
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
  const redis = getEphemeralRedis(env);
  if (redis) {
    await redis.set(activeKey(sessionId), "1", { ex: ttlSec });
    return;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  memoryActive.set(sessionId, Date.now() + ttlSec * 1000);
}

export async function isEphemeralWalletSessionActive(
  sessionId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const redis = getEphemeralRedis(env);
  if (redis) {
    const v = await redis.get(activeKey(sessionId));
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
  const redis = getEphemeralRedis(env);
  if (redis) {
    const n = await redis.del(activeKey(sessionId));
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
  if (isEphemeralRedisConfigured(env)) {
    return { ok: true, code: null };
  }
  if (memoryAllowed(env)) return { ok: true, code: "memory_test_only" };
  return { ok: false, code: "ephemeral_state_not_configured" };
}
