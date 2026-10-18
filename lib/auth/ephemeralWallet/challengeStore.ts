// FILE: lib/auth/ephemeralWallet/challengeStore.ts

import { createHash } from "crypto";
import type { EphemeralWalletChallengeRecord } from "./challengeRecord";
import {
  ephemeralKvGet,
  ephemeralKvGetDel,
  ephemeralKvSet,
  probeEphemeralKv,
} from "./redisKv";
import { EphemeralStateUnavailableError } from "./errors";
import {
  authoritativeChallengeReplayBackend,
  processChallengeStoreAllowed,
  requiresDistributedChallengeStore,
} from "./transientStatePolicy";

const KEY_PREFIX = "abraxas:ephemeral:wallet-challenge:v1:";

export function hashEphemeralSessionContext(sessionContext: string): string {
  return createHash("sha256").update(sessionContext).digest("hex");
}

type MemoryEntry = { record: EphemeralWalletChallengeRecord; expiresAtMs: number };

const memoryStore = new Map<string, MemoryEntry>();
const memoryLocks = new Map<string, Promise<void>>();

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  return processChallengeStoreAllowed(env);
}

function useRedisChallengeStore(env: Record<string, string | undefined>): boolean {
  return authoritativeChallengeReplayBackend(env) === "redis";
}

function challengeKey(challengeId: string): string {
  return `${KEY_PREFIX}${challengeId}`;
}

export async function putEphemeralWalletChallenge(
  record: EphemeralWalletChallengeRecord,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  if (useRedisChallengeStore(env)) {
    await ephemeralKvSet(challengeKey(record.challenge_id), record, ttlSec, env);
    return;
  }
  if (requiresDistributedChallengeStore(env) || !memoryAllowed(env)) {
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
  if (useRedisChallengeStore(env)) {
    return await ephemeralKvGet<EphemeralWalletChallengeRecord>(challengeKey(challengeId), env);
  }
  if (requiresDistributedChallengeStore(env) || !memoryAllowed(env)) {
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
  if (useRedisChallengeStore(env)) {
    return await ephemeralKvGetDel<EphemeralWalletChallengeRecord>(challengeKey(challengeId), env);
  }
  if (requiresDistributedChallengeStore(env) || !memoryAllowed(env)) {
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
  if (useRedisChallengeStore(env)) {
    const probe = await probeEphemeralKv(env);
    if (!probe.ok) {
      return { ok: false, code: probe.code ?? "redis_unreachable", backend: "redis" };
    }
    return { ok: true, code: null, backend: "redis" };
  }
  if (requiresDistributedChallengeStore(env)) {
    return { ok: false, code: "distributed_replay_not_configured", backend: "none" };
  }
  if (memoryAllowed(env)) {
    return { ok: true, code: "process_transient_dev_only", backend: "memory" };
  }
  return { ok: false, code: "ephemeral_state_not_configured", backend: "none" };
}

export function resetEphemeralChallengeStoreForTests(): void {
  memoryStore.clear();
  memoryLocks.clear();
}
