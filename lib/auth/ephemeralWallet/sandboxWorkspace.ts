// FILE: lib/auth/ephemeralWallet/sandboxWorkspace.ts
// Ephemeral sandbox workspace metadata — expires automatically (not a personal account).

import { randomBytes } from "crypto";
import { EphemeralStateUnavailableError } from "./errors";
import { EPHEMERAL_TTL } from "./retention";
import { ephemeralKvGet, ephemeralKvSet, resolveEphemeralKvBackend } from "./redisKv";

const PREFIX = "abraxas:ephemeral:sandbox:v1:";
const DEFAULT_TTL_SEC = EPHEMERAL_TTL.sandboxWorkspaceSec;

export type EphemeralSandboxWorkspace = {
  workspace_id: string;
  wallet_address: string;
  session_id: string;
  created_at: string;
  expires_at: string;
};

const memory = new Map<string, EphemeralSandboxWorkspace>();

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  if (env.NODE_ENV === "production") return false;
  return env.VITEST === "true" || env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST === "1";
}

export function createEphemeralSandboxWorkspaceId(): string {
  return `esbx_${randomBytes(12).toString("hex")}`;
}

export async function putEphemeralSandboxWorkspace(
  record: EphemeralSandboxWorkspace,
  ttlSec: number = DEFAULT_TTL_SEC,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  if (resolveEphemeralKvBackend(env) !== "none") {
    await ephemeralKvSet(`${PREFIX}${record.workspace_id}`, record, ttlSec, env);
    await ephemeralKvSet(`${PREFIX}by-session:${record.session_id}`, record.workspace_id, ttlSec, env);
    return;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  memory.set(record.workspace_id, record);
}

export async function getEphemeralSandboxForSession(
  sessionId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<EphemeralSandboxWorkspace | null> {
  if (resolveEphemeralKvBackend(env) !== "none") {
    const workspaceId = await ephemeralKvGet<string>(`${PREFIX}by-session:${sessionId}`, env);
    if (!workspaceId) return null;
    return await ephemeralKvGet<EphemeralSandboxWorkspace>(`${PREFIX}${workspaceId}`, env);
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  for (const record of Array.from(memory.values())) {
    if (record.session_id === sessionId) return record;
  }
  return null;
}

export function resetEphemeralSandboxStoreForTests(): void {
  memory.clear();
}
