// FILE: lib/auth/ephemeralWallet/sandboxPresentationCommitStore.ts

import { randomBytes } from "crypto";
import type { PassportPossessionChallengePayload } from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import { ephemeralKvGet, ephemeralKvGetDel, ephemeralKvSet } from "./redisKv";
import { EPHEMERAL_TTL } from "./retention";
import { EphemeralStateUnavailableError } from "./errors";
import {
  authoritativeChallengeReplayBackend,
  processChallengeStoreAllowed,
  requiresDistributedChallengeStore,
} from "./transientStatePolicy";

const KEY_PREFIX = "abraxas:ephemeral:sandbox-presentation-commit:v1:";

export type SandboxPresentationCommitRecord = {
  commit_id: string;
  session_id: string;
  workspace_id: string;
  wallet_address: string;
  policy_id: string;
  policy_version: number;
  presentation_method_id: string;
  evidence_hash: string;
  expires_at: string;
  sandbox_labeled: true;
  production_trusted: false;
  possession_challenge?: PassportPossessionChallengePayload;
  possession_authorized_at?: string | null;
};

const memoryStore = new Map<string, SandboxPresentationCommitRecord>();
const memoryLocks = new Map<string, Promise<void>>();

function useRedisPresentationCommitStore(env: Record<string, string | undefined>): boolean {
  return authoritativeChallengeReplayBackend(env) === "redis";
}

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  return processChallengeStoreAllowed(env);
}

function commitKey(commitId: string): string {
  return `${KEY_PREFIX}${commitId}`;
}

export function createSandboxPresentationCommitId(): string {
  return `esbx_pc_${randomBytes(12).toString("hex")}`;
}

export async function storeSandboxPresentationCommit(
  record: SandboxPresentationCommitRecord,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const ttl = EPHEMERAL_TTL.sandboxTestCredentialSec;
  if (useRedisPresentationCommitStore(env)) {
    await ephemeralKvSet(commitKey(record.commit_id), record, ttl, env);
    return;
  }
  if (requiresDistributedChallengeStore(env) || !memoryAllowed(env)) {
    throw new EphemeralStateUnavailableError();
  }
  memoryStore.set(record.commit_id, record);
}

/** Atomic consume-once (Redis GETDEL in distributed Production; serialized Map in local dev). */
export async function peekSandboxPresentationCommit(
  commitId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<SandboxPresentationCommitRecord | null> {
  if (useRedisPresentationCommitStore(env)) {
    const record = await ephemeralKvGet<SandboxPresentationCommitRecord>(commitKey(commitId), env);
    if (!record) return null;
    if (Date.parse(record.expires_at) < Date.now()) return null;
    return record;
  }
  if (requiresDistributedChallengeStore(env) || !memoryAllowed(env)) {
    throw new EphemeralStateUnavailableError();
  }
  const record = memoryStore.get(commitId) ?? null;
  if (!record) return null;
  if (Date.parse(record.expires_at) < Date.now()) return null;
  return record;
}

export async function markSandboxPresentationCommitPossessionAuthorized(
  commitId: string,
  authorizedAt: string,
  env: Record<string, string | undefined> = process.env,
): Promise<SandboxPresentationCommitRecord | null> {
  const ttl = EPHEMERAL_TTL.sandboxTestCredentialSec;
  if (useRedisPresentationCommitStore(env)) {
    const record = await peekSandboxPresentationCommit(commitId, env);
    if (!record) return null;
    const updated: SandboxPresentationCommitRecord = {
      ...record,
      possession_authorized_at: authorizedAt,
    };
    await ephemeralKvSet(commitKey(commitId), updated, ttl, env);
    return updated;
  }
  if (requiresDistributedChallengeStore(env) || !memoryAllowed(env)) {
    throw new EphemeralStateUnavailableError();
  }
  const record = memoryStore.get(commitId);
  if (!record) return null;
  const updated: SandboxPresentationCommitRecord = {
    ...record,
    possession_authorized_at: authorizedAt,
  };
  memoryStore.set(commitId, updated);
  return updated;
}

export async function consumeSandboxPresentationCommit(
  commitId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<SandboxPresentationCommitRecord | null> {
  if (useRedisPresentationCommitStore(env)) {
    return await ephemeralKvGetDel<SandboxPresentationCommitRecord>(commitKey(commitId), env);
  }
  if (requiresDistributedChallengeStore(env) || !memoryAllowed(env)) {
    throw new EphemeralStateUnavailableError();
  }

  const prior = memoryLocks.get(commitId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  memoryLocks.set(commitId, prior.then(() => gate));

  await prior;
  try {
    const record = memoryStore.get(commitId) ?? null;
    if (!record) return null;
    memoryStore.delete(commitId);
    if (Date.parse(record.expires_at) < Date.now()) return null;
    return record;
  } finally {
    release();
    memoryLocks.delete(commitId);
  }
}

export function resetSandboxPresentationCommitStoreForTests(): void {
  memoryStore.clear();
  memoryLocks.clear();
}
