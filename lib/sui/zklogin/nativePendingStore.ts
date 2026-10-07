// FILE: lib/sui/zklogin/nativePendingStore.ts
// Short-lived server-side zkLogin pending material for native external-browser OAuth.

import { randomBytes } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { ZkLoginPendingSession } from "./session";
import { hashZkLoginOAuthJti } from "./oauthJtiReplayStore";
import {
  decryptNativeBridgePayload,
  encryptNativeBridgePayload,
  hashNativeBridgeValue,
} from "./nativeHandoffCrypto";

const TABLE = "zklogin_native_pending";
const TTL_SEC = 10 * 60;
const memoryPending = new Map<string, {
  payload: ZkLoginPendingSession;
  consumeVerifierHash: string;
  expiresAtMs: number;
}>();

function skipDurableStore(): boolean {
  if (process.env.NATIVE_PENDING_FORCE_DURABLE_TEST === "1") return false;
  return Boolean(process.env.VITEST);
}

function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.ABRAXAS_RUNTIME_ENV === "production") return true;
  if (process.env.VERCEL === "1") return false;
  return process.env.NODE_ENV === "production";
}

export function mintNativeConsumeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function hashNativeConsumeVerifier(verifier: string): string {
  return hashNativeBridgeValue("zklogin_native_consume_verifier", verifier);
}

export async function saveNativeZkLoginPending(input: {
  jti: string;
  session: ZkLoginPendingSession;
  consumeVerifier: string;
}): Promise<boolean> {
  const jtiHash = hashZkLoginOAuthJti(input.jti);
  const encrypted = encryptNativeBridgePayload(input.session);
  if (!encrypted) return false;

  const consumeVerifierHash = hashNativeConsumeVerifier(input.consumeVerifier);
  const expiresAt = new Date(Date.now() + TTL_SEC * 1000).toISOString();

  if (skipDurableStore()) {
    memoryPending.set(jtiHash, {
      payload: input.session,
      consumeVerifierHash,
      expiresAtMs: Date.now() + TTL_SEC * 1000,
    });
    return true;
  }

  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(TABLE).upsert({
      jti_hash: jtiHash,
      pending_ciphertext: encrypted,
      consume_verifier_hash: consumeVerifierHash,
      expires_at: expiresAt,
    });
    if (error) throw error;
    return true;
  } catch {
    if (isProductionRuntime()) return false;
    memoryPending.set(jtiHash, {
      payload: input.session,
      consumeVerifierHash,
      expiresAtMs: Date.now() + TTL_SEC * 1000,
    });
    return true;
  }
}

export async function loadNativeZkLoginPending(jti: string): Promise<ZkLoginPendingSession | null> {
  const row = await loadNativeZkLoginPendingRow(jti);
  return row?.session ?? null;
}

export async function loadNativeConsumeVerifierHash(jti: string): Promise<string | null> {
  const row = await loadNativeZkLoginPendingRow(jti);
  return row?.consumeVerifierHash ?? null;
}

async function loadNativeZkLoginPendingRow(jti: string): Promise<{
  session: ZkLoginPendingSession;
  consumeVerifierHash: string;
} | null> {
  const jtiHash = hashZkLoginOAuthJti(jti);

  if (skipDurableStore() || memoryPending.has(jtiHash)) {
    const row = memoryPending.get(jtiHash);
    if (!row) return null;
    if (Date.now() > row.expiresAtMs) {
      memoryPending.delete(jtiHash);
      return null;
    }
    return { session: row.payload, consumeVerifierHash: row.consumeVerifierHash };
  }

  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from(TABLE)
      .select("pending_ciphertext, consume_verifier_hash, expires_at")
      .eq("jti_hash", jtiHash)
      .maybeSingle();
    if (error || !data?.pending_ciphertext) return null;
    if (new Date(String(data.expires_at)).getTime() < Date.now()) {
      await sb.from(TABLE).delete().eq("jti_hash", jtiHash);
      return null;
    }
    const session = decryptNativeBridgePayload<ZkLoginPendingSession>(String(data.pending_ciphertext));
    if (!session) return null;
    return {
      session,
      consumeVerifierHash: String(data.consume_verifier_hash),
    };
  } catch {
    return null;
  }
}

export async function clearNativeZkLoginPending(jti: string): Promise<void> {
  const jtiHash = hashZkLoginOAuthJti(jti);
  memoryPending.delete(jtiHash);
  if (skipDurableStore()) return;
  try {
    const sb = requireSupabaseAdmin();
    await sb.from(TABLE).delete().eq("jti_hash", jtiHash);
  } catch {
    // best-effort
  }
}

export function resetNativePendingStoreForTests(): void {
  memoryPending.clear();
}
