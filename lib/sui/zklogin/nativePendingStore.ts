// FILE: lib/sui/zklogin/nativePendingStore.ts
// Short-lived server-side zkLogin pending material for native external-browser OAuth.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { ZkLoginPendingSession } from "./session";
import { hashZkLoginOAuthJti } from "./oauthJtiReplayStore";

const TABLE = "zklogin_native_pending";
const TTL_SEC = 10 * 60;
const memoryPending = new Map<string, { payload: ZkLoginPendingSession; expiresAtMs: number }>();

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

function pendingSecret(): Buffer | null {
  const raw =
    process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    ?? process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!raw) return null;
  return createHash("sha256").update(raw, "utf8").digest();
}

function encryptPending(session: ZkLoginPendingSession): string | null {
  const secret = pendingSecret();
  if (!secret) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  const plaintext = JSON.stringify(session);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptPending(encoded: string): ZkLoginPendingSession | null {
  const secret = pendingSecret();
  if (!secret) return null;
  try {
    const buf = Buffer.from(encoded, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", secret, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(plaintext) as ZkLoginPendingSession;
  } catch {
    return null;
  }
}

export async function saveNativeZkLoginPending(input: {
  jti: string;
  session: ZkLoginPendingSession;
}): Promise<boolean> {
  const jtiHash = hashZkLoginOAuthJti(input.jti);
  const encrypted = encryptPending(input.session);
  if (!encrypted) return false;

  const expiresAt = new Date(Date.now() + TTL_SEC * 1000).toISOString();

  if (skipDurableStore()) {
    memoryPending.set(jtiHash, {
      payload: input.session,
      expiresAtMs: Date.now() + TTL_SEC * 1000,
    });
    return true;
  }

  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(TABLE).upsert({
      jti_hash: jtiHash,
      pending_ciphertext: encrypted,
      expires_at: expiresAt,
    });
    if (error) throw error;
    return true;
  } catch {
    if (isProductionRuntime()) return false;
    memoryPending.set(jtiHash, {
      payload: input.session,
      expiresAtMs: Date.now() + TTL_SEC * 1000,
    });
    return true;
  }
}

export async function loadNativeZkLoginPending(jti: string): Promise<ZkLoginPendingSession | null> {
  const jtiHash = hashZkLoginOAuthJti(jti);

  if (skipDurableStore() || memoryPending.has(jtiHash)) {
    const row = memoryPending.get(jtiHash);
    if (!row) return null;
    if (Date.now() > row.expiresAtMs) {
      memoryPending.delete(jtiHash);
      return null;
    }
    return row.payload;
  }

  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from(TABLE)
      .select("pending_ciphertext, expires_at")
      .eq("jti_hash", jtiHash)
      .maybeSingle();
    if (error || !data?.pending_ciphertext) return null;
    if (new Date(String(data.expires_at)).getTime() < Date.now()) {
      await sb.from(TABLE).delete().eq("jti_hash", jtiHash);
      return null;
    }
    return decryptPending(String(data.pending_ciphertext));
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
