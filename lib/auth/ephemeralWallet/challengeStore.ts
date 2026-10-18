// FILE: lib/auth/ephemeralWallet/challengeStore.ts

import { createHash } from "crypto";
import type { EphemeralWalletChallengeRecord } from "./challengeRecord";
import { getEphemeralRedis, isEphemeralRedisConfigured } from "./redisClient";
import { EphemeralStateUnavailableError } from "./errors";

const KEY_PREFIX = "abraxas:ephemeral:wallet-challenge:v1:";

export function hashEphemeralSessionContext(sessionContext: string): string {
  return createHash("sha256").update(sessionContext).digest("hex");
}

type MemoryEntry = { record: EphemeralWalletChallengeRecord; expiresAtMs: number };

const memoryStore = new Map<string, MemoryEntry>();
const memoryLocks = new Map<string, Promise<void>>();

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  if (env.NODE_ENV === "production") return false;
  return env.VITEST === "true" || env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST === "1";
}

function challengeKey(challengeId: string): string {
  return `${KEY_PREFIX}${challengeId}`;
}

export async function putEphemeralWalletChallenge(
  record: EphemeralWalletChallengeRecord,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const redis = getEphemeralRedis(env);
  if (redis) {
    await redis.set(challengeKey(record.challenge_id), record, { ex: ttlSec });
    return;
  }
  if (!memoryAllowed(env)) {
    throw new EphemeralStateUnavailableError();
  }
  memoryStore.set(record.challenge_id, {
    record,
    expiresAtMs: Date.now() + ttlSec * 1000,
  });
}

/** Atomic consume-once: returns record or null if missing/already consumed/expired. */
export async function consumeEphemeralWalletChallenge(
  challengeId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<EphemeralWalletChallengeRecord | null> {
  const redis = getEphemeralRedis(env);
  if (redis) {
    const key = challengeKey(challengeId);
    const record = (await redis.getdel(key)) as EphemeralWalletChallengeRecord | null;
    return record ?? null;
  }
  if (!memoryAllowed(env)) {
    throw new EphemeralStateUnavailableError();
  }

  const prior = memoryLocks.get(challengeId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  memoryLocks.set(challengeId, prior.then(() => gate));

  await prior;
  try {
    const entry = memoryStore.get(challengeId);
    if (!entry) return null;
    if (entry.expiresAtMs <= Date.now()) {
      memoryStore.delete(challengeId);
      return null;
    }
    memoryStore.delete(challengeId);
    return entry.record;
  } finally {
    release();
    memoryLocks.delete(challengeId);
  }
}

export async function probeEphemeralChallengeStore(
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: boolean; code: string | null; backend: "redis" | "memory" | "none" }> {
  if (isEphemeralRedisConfigured(env)) {
    const redis = getEphemeralRedis(env);
    if (!redis) return { ok: false, code: "redis_unavailable", backend: "none" };
    try {
      const probeKey = `${KEY_PREFIX}__probe__`;
      await redis.set(probeKey, "1", { ex: 5 });
      await redis.del(probeKey);
      return { ok: true, code: null, backend: "redis" };
    } catch {
      return { ok: false, code: "redis_unreachable", backend: "redis" };
    }
  }
  if (memoryAllowed(env)) {
    return { ok: true, code: "memory_test_only", backend: "memory" };
  }
  return { ok: false, code: "ephemeral_state_not_configured", backend: "none" };
}

export function resetEphemeralChallengeStoreForTests(): void {
  memoryStore.clear();
  memoryLocks.clear();
}
