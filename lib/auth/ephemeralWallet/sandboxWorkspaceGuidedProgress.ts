// FILE: lib/auth/ephemeralWallet/sandboxWorkspaceGuidedProgress.ts
// Build 878 — server-authoritative guided integration progress (refresh-safe; not query-param auth).

import { EphemeralStateUnavailableError } from "./errors";
import { EPHEMERAL_TTL } from "./retention";
import { ephemeralKvGet, ephemeralKvSet } from "./redisKv";
import { processTransientStateAllowed, resolveTransientStateBackend } from "./transientStatePolicy";

const PREFIX = "abraxas:ephemeral:sandbox-guided-progress:v1:";
const DEFAULT_TTL_SEC = EPHEMERAL_TTL.sandboxWorkspaceSec;

export type EphemeralSandboxGuidedReceiptValidation = {
  status: "validated" | "failed";
  checked_at: string;
  signature_authentic: boolean;
  currently_acceptable: boolean;
  invalidation_reasons: string[];
  standalone_cryptographic_verification?: boolean;
  verification_summary?: string | null;
};

export type EphemeralSandboxGuidedProgress = {
  workspace_id: string;
  session_id: string;
  policy_id: string;
  decision: string;
  receipt_id: string;
  recorded_at: string;
  receipt_validation?: EphemeralSandboxGuidedReceiptValidation | null;
};

const memoryByWorkspace = new Map<string, EphemeralSandboxGuidedProgress>();
const memorySessionIndex = new Map<string, string>();

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  return processTransientStateAllowed(env);
}

function workspaceKey(workspaceId: string): string {
  return `${PREFIX}${workspaceId}`;
}

function sessionKey(sessionId: string): string {
  return `${PREFIX}by-session:${sessionId}`;
}

export async function recordEphemeralSandboxGuidedProgress(
  progress: EphemeralSandboxGuidedProgress,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const ttl = DEFAULT_TTL_SEC;
  if (resolveTransientStateBackend(env) === "redis") {
    await ephemeralKvSet(workspaceKey(progress.workspace_id), progress, ttl, env);
    await ephemeralKvSet(sessionKey(progress.session_id), progress.workspace_id, ttl, env);
    return;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  memoryByWorkspace.set(progress.workspace_id, progress);
  memorySessionIndex.set(progress.session_id, progress.workspace_id);
}

export async function getEphemeralSandboxGuidedProgressForSession(
  sessionId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<EphemeralSandboxGuidedProgress | null> {
  if (resolveTransientStateBackend(env) === "redis") {
    const workspaceId = await ephemeralKvGet<string>(sessionKey(sessionId), env);
    if (!workspaceId) return null;
    return await ephemeralKvGet<EphemeralSandboxGuidedProgress>(workspaceKey(workspaceId), env);
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  const workspaceId = memorySessionIndex.get(sessionId);
  if (!workspaceId) return null;
  return memoryByWorkspace.get(workspaceId) ?? null;
}

export async function updateEphemeralSandboxGuidedReceiptValidation(input: {
  sessionId: string;
  workspaceId: string;
  receiptId: string;
  validation: EphemeralSandboxGuidedReceiptValidation;
  env?: Record<string, string | undefined>;
}): Promise<{ ok: true } | { ok: false; code: "not_found" | "receipt_mismatch" | "workspace_mismatch" }> {
  const env = input.env ?? process.env;
  const current = await getEphemeralSandboxGuidedProgressForSession(input.sessionId, env);
  if (!current) return { ok: false, code: "not_found" };
  if (current.workspace_id !== input.workspaceId) return { ok: false, code: "workspace_mismatch" };
  if (current.receipt_id !== input.receiptId) return { ok: false, code: "receipt_mismatch" };
  const next: EphemeralSandboxGuidedProgress = {
    ...current,
    receipt_validation: input.validation,
  };
  await recordEphemeralSandboxGuidedProgress(next, env);
  return { ok: true };
}

export function resetEphemeralSandboxGuidedProgressForTests(): void {
  memoryByWorkspace.clear();
  memorySessionIndex.clear();
}
