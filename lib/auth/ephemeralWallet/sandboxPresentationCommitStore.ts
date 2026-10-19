// FILE: lib/auth/ephemeralWallet/sandboxPresentationCommitStore.ts

import { randomBytes } from "crypto";
import { ephemeralKvGetDel, ephemeralKvSet } from "./redisKv";
import { EPHEMERAL_TTL } from "./retention";
import { EphemeralStateUnavailableError } from "./errors";
import { processTransientStateAllowed, resolveTransientStateBackend } from "./transientStatePolicy";

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
};

const memoryStore = new Map<string, SandboxPresentationCommitRecord>();

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  return processTransientStateAllowed(env);
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
  if (resolveTransientStateBackend(env) === "redis") {
    await ephemeralKvSet(commitKey(record.commit_id), record, ttl, env);
    return;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  memoryStore.set(record.commit_id, record);
}

export async function consumeSandboxPresentationCommit(
  commitId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<SandboxPresentationCommitRecord | null> {
  if (resolveTransientStateBackend(env) === "redis") {
    return await ephemeralKvGetDel<SandboxPresentationCommitRecord>(commitKey(commitId), env);
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  const record = memoryStore.get(commitId) ?? null;
  if (record) memoryStore.delete(commitId);
  if (record && Date.parse(record.expires_at) < Date.now()) return null;
  return record;
}

export function resetSandboxPresentationCommitStoreForTests(): void {
  memoryStore.clear();
}
