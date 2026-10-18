// FILE: lib/auth/ephemeralWallet/challengeStore.ts

import { createHash } from "crypto";
import type { EphemeralWalletChallengeRecord } from "./challengeRecord";
import { isEphemeralRedisConfigured } from "./redisClient";
import {
  ephemeralKvGet,
  ephemeralKvGetDel,
  ephemeralKvSet,
  probeEphemeralKv,
  resolveEphemeralKvBackend,
} from "./redisKv";
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
  if (resolveEphemeralKvBackend(env) !== "none") {
    await ephemeralKvSet(challengeKey(record.challenge_id), record, ttlSec, env);
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

/** Read challenge without consuming (verify signature before commit). */
export async function peekEphemeralWalletChallenge(
  challengeId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<EphemeralWalletChallengeRecord | null> {
  if (resolveEphemeralKvBackend(env) !== "none") {
    return await ephemeralKvGet<EphemeralWalletChallengeRecord>(challengeKey(challengeId), env);
  }
  if (!memoryAllowed(env)) {
    throw new EphemeralStateUnavailableError();
  }
  const entry = memoryStore.get(challengeId);
  if (!entry) return null;
  if (entry.expiresAtMs <= Date.now()) {
    memoryStore.delete(challengeId);
    return null;
  }
  return entry.record;
}

/** Atomic consume-once after successful verification. */
export async function commitEphemeralWalletChallenge(
  challengeId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<EphemeralWalletChallengeRecord | null> {
  return consumeEphemeralWalletChallenge(challengeId, env);
}

/** Atomic consume-once: returns record or null if missing/already consumed/expired. */
export async function consumeEphemeralWalletChallenge(
  challengeId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<EphemeralWalletChallengeRecord | null> {
  if (resolveEphemeralKvBackend(env) !== "none") {
    return await ephemeralKvGetDel<EphemeralWalletChallengeRecord>(challengeKey(challengeId), env);
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
  if (isEphemeralRedisConfigured(env) || resolveEphemeralKvBackend(env) === "tcp") {
    const probe = await probeEphemeralKv(env);
    const backend = probe.backend === "none" ? "none" : "redis";
    return { ok: probe.ok, code: probe.code, backend: probe.ok ? backend : backend };
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
