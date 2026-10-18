// FILE: lib/auth/ephemeralWallet/sandboxWorkspace.ts
// Ephemeral sandbox workspace metadata — expires automatically (not a personal account).

import { randomBytes } from "crypto";
import { getEphemeralRedis, isEphemeralRedisConfigured } from "./redisClient";
import { EphemeralStateUnavailableError } from "./errors";

const PREFIX = "abraxas:ephemeral:sandbox:v1:";
const DEFAULT_TTL_SEC = 24 * 60 * 60;

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
  const redis = getEphemeralRedis(env);
  if (redis) {
    await redis.set(`${PREFIX}${record.workspace_id}`, record, { ex: ttlSec });
    await redis.set(`${PREFIX}by-session:${record.session_id}`, record.workspace_id, { ex: ttlSec });
    return;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  memory.set(record.workspace_id, record);
}

export async function getEphemeralSandboxForSession(
  sessionId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<EphemeralSandboxWorkspace | null> {
  const redis = getEphemeralRedis(env);
  if (redis) {
    const workspaceId = (await redis.get(`${PREFIX}by-session:${sessionId}`)) as string | null;
    if (!workspaceId) return null;
    return (await redis.get(`${PREFIX}${workspaceId}`)) as EphemeralSandboxWorkspace | null;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  for (const record of memory.values()) {
    if (record.session_id === sessionId) return record;
  }
  return null;
}

export function resetEphemeralSandboxStoreForTests(): void {
  memory.clear();
}
