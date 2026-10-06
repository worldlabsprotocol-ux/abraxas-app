// FILE: lib/sui/zklogin/oauthJtiReplayStore.ts
// Durable one-time JTI consumption for zkLogin OAuth state (multi-instance safe).

import { createHash } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

const TABLE = "zklogin_oauth_jti_consumed";
const JTI_HASH_PREFIX = "zklogin_oauth_jti:";

const memoryConsumed = new Set<string>();

function skipDurableStore(): boolean {
  if (process.env.OAUTH_JTI_FORCE_DURABLE_TEST === "1") return false;
  return Boolean(process.env.VITEST);
}

function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.ABRAXAS_RUNTIME_ENV === "production") return true;
  if (process.env.VERCEL === "1") return false;
  return process.env.NODE_ENV === "production";
}

export function hashZkLoginOAuthJti(jti: string): string {
  return createHash("sha256")
    .update(`${JTI_HASH_PREFIX}${jti.trim()}`, "utf8")
    .digest("hex");
}

export function resetZkLoginOAuthJtiReplayStoreForTests(): void {
  memoryConsumed.clear();
}

export type ConsumeZkLoginOAuthJtiResult =
  | { ok: true }
  | { ok: false; reason: "replayed" | "store_unavailable" };

function tryConsumeMemory(jtiHash: string): ConsumeZkLoginOAuthJtiResult {
  if (memoryConsumed.has(jtiHash)) {
    return { ok: false, reason: "replayed" };
  }
  memoryConsumed.add(jtiHash);
  return { ok: true };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "23505";
}

export async function consumeZkLoginOAuthJti(input: {
  jti: string;
  expiresAtIso: string;
}): Promise<ConsumeZkLoginOAuthJtiResult> {
  const jti = input.jti.trim();
  if (!jti) return { ok: false, reason: "store_unavailable" };

  const jtiHash = hashZkLoginOAuthJti(jti);
  const expiresAt = input.expiresAtIso.trim();
  if (!expiresAt) return { ok: false, reason: "store_unavailable" };

  if (skipDurableStore()) {
    return tryConsumeMemory(jtiHash);
  }

  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(TABLE).insert({
      jti_hash: jtiHash,
      expires_at: expiresAt,
    });
    if (error) {
      if (isUniqueViolation(error)) {
        return { ok: false, reason: "replayed" };
      }
      throw error;
    }
    memoryConsumed.add(jtiHash);
    return { ok: true };
  } catch {
    if (isProductionRuntime()) {
      return { ok: false, reason: "store_unavailable" };
    }
    return tryConsumeMemory(jtiHash);
  }
}

export async function purgeExpiredZkLoginOAuthJtis(input?: {
  limit?: number;
  bufferMs?: number;
}): Promise<{ deleted: number }> {
  if (skipDurableStore()) {
    return { deleted: 0 };
  }

  const limit = Math.min(input?.limit ?? 500, 2000);
  const bufferMs = input?.bufferMs ?? 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - bufferMs).toISOString();

  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from(TABLE)
      .delete()
      .lt("expires_at", cutoff)
      .select("jti_hash")
      .limit(limit);
    if (error) throw error;
    return { deleted: (data ?? []).length };
  } catch {
    return { deleted: 0 };
  }
}
