// FILE: lib/sui/zklogin/nativeHandoff.ts
// Opaque native holder handoff codes — no bearer JWT in custom-scheme URLs.

import { randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  decryptNativeBridgePayload,
  encryptNativeBridgePayload,
  hashNativeBridgeValue,
} from "./nativeHandoffCrypto";

export const NATIVE_HANDOFF_CODE_QUERY = "holder_native_handoff_code";
export const NATIVE_CONSUME_VERIFIER_SESSION_KEY = "abraxas_native_consume_verifier_v1";
export const NATIVE_HANDOFF_TTL_SEC = 5 * 60;

const PENDING_TABLE = "zklogin_native_handoff_pending";
const CONSUMED_TABLE = "zklogin_native_handoff_consumed";
const memoryPending = new Map<string, {
  oauthJtiHash: string;
  consumeVerifierHash: string;
  payload: NativeHandoffPayload;
  expiresAtMs: number;
}>();
const memoryConsumed = new Set<string>();

export type NativeHandoffPayload = {
  suiAddress: string;
  email?: string;
  provider: string;
  oauthSub: string;
  maxEpoch: number;
  userSalt: string;
  ephemeralSecretKey: string;
  randomness: string;
  loginMode: "canonical" | "legacy_recovery";
  idToken: string;
};

function skipDurableStore(): boolean {
  if (process.env.NATIVE_HANDOFF_FORCE_DURABLE_TEST === "1") return false;
  return Boolean(process.env.VITEST);
}

function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.ABRAXAS_RUNTIME_ENV === "production") return true;
  if (process.env.VERCEL === "1") return false;
  return process.env.NODE_ENV === "production";
}

export function hashNativeHandoffCode(code: string): string {
  return hashNativeBridgeValue("zklogin_native_handoff_code", code);
}

export function hashNativeConsumeVerifier(verifier: string): string {
  return hashNativeBridgeValue("zklogin_native_consume_verifier", verifier);
}

export async function mintNativeHandoffCode(input: {
  payload: NativeHandoffPayload;
  oauthJti: string;
  consumeVerifierHash: string;
}): Promise<string | null> {
  const code = randomBytes(24).toString("base64url");
  const codeHash = hashNativeHandoffCode(code);
  const encrypted = encryptNativeBridgePayload(input.payload);
  if (!encrypted) return null;

  const expiresAt = new Date(Date.now() + NATIVE_HANDOFF_TTL_SEC * 1000).toISOString();
  const oauthJtiHash = hashNativeBridgeValue("zklogin_oauth_jti", input.oauthJti);

  if (skipDurableStore()) {
    memoryPending.set(codeHash, {
      oauthJtiHash,
      consumeVerifierHash: input.consumeVerifierHash,
      payload: input.payload,
      expiresAtMs: Date.now() + NATIVE_HANDOFF_TTL_SEC * 1000,
    });
    memoryConsumed.delete(codeHash);
    return code;
  }

  try {
    const sb = requireSupabaseAdmin();
    await sb.from(PENDING_TABLE).delete().lt("expires_at", new Date().toISOString());
    const { error } = await sb.from(PENDING_TABLE).insert({
      handoff_code_hash: codeHash,
      oauth_jti_hash: oauthJtiHash,
      consume_verifier_hash: input.consumeVerifierHash,
      handoff_ciphertext: encrypted,
      expires_at: expiresAt,
    });
    if (error) throw error;
    return code;
  } catch {
    if (isProductionRuntime()) return null;
    memoryPending.set(codeHash, {
      oauthJtiHash,
      consumeVerifierHash: input.consumeVerifierHash,
      payload: input.payload,
      expiresAtMs: Date.now() + NATIVE_HANDOFF_TTL_SEC * 1000,
    });
    return code;
  }
}

async function markHandoffConsumed(codeHash: string, expiresAtIso: string): Promise<boolean> {
  if (skipDurableStore()) {
    if (memoryConsumed.has(codeHash)) return false;
    memoryConsumed.add(codeHash);
    return true;
  }

  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(CONSUMED_TABLE).insert({
      handoff_code_hash: codeHash,
      expires_at: expiresAtIso,
    });
    if (error) {
      if ((error as { code?: string }).code === "23505") return false;
      throw error;
    }
    memoryConsumed.add(codeHash);
    return true;
  } catch {
    if (isProductionRuntime()) return false;
    if (memoryConsumed.has(codeHash)) return false;
    memoryConsumed.add(codeHash);
    return true;
  }
}

export async function verifyAndConsumeNativeHandoffCode(
  code: string | null | undefined,
  consumeVerifier: string | null | undefined,
): Promise<NativeHandoffPayload | null> {
  const rawCode = code?.trim();
  const rawVerifier = consumeVerifier?.trim();
  if (!rawCode || !rawVerifier) return null;

  const codeHash = hashNativeHandoffCode(rawCode);
  const verifierHash = hashNativeConsumeVerifier(rawVerifier);

  let row: {
    oauthJtiHash: string;
    consumeVerifierHash: string;
    payload: NativeHandoffPayload;
    expiresAtMs: number;
  } | null = null;

  if (skipDurableStore() || memoryPending.has(codeHash)) {
    const pending = memoryPending.get(codeHash);
    if (!pending || Date.now() > pending.expiresAtMs) return null;
    row = pending;
  } else {
    try {
      const sb = requireSupabaseAdmin();
      const { data, error } = await sb
        .from(PENDING_TABLE)
        .select("oauth_jti_hash, consume_verifier_hash, handoff_ciphertext, expires_at")
        .eq("handoff_code_hash", codeHash)
        .maybeSingle();
      if (error || !data?.handoff_ciphertext) return null;
      const expiresAtMs = new Date(String(data.expires_at)).getTime();
      if (expiresAtMs < Date.now()) return null;
      const payload = decryptNativeBridgePayload<NativeHandoffPayload>(String(data.handoff_ciphertext));
      if (!payload) return null;
      row = {
        oauthJtiHash: String(data.oauth_jti_hash),
        consumeVerifierHash: String(data.consume_verifier_hash),
        payload,
        expiresAtMs,
      };
    } catch {
      return null;
    }
  }

  if (!row || row.consumeVerifierHash !== verifierHash) return null;

  const expiresAtIso = new Date(row.expiresAtMs).toISOString();
  const consumed = await markHandoffConsumed(codeHash, expiresAtIso);
  if (!consumed) return null;

  memoryPending.delete(codeHash);
  if (!skipDurableStore()) {
    try {
      const sb = requireSupabaseAdmin();
      await sb.from(PENDING_TABLE).delete().eq("handoff_code_hash", codeHash);
    } catch {
      // best-effort
    }
  }

  try {
    return {
      ...row.payload,
      suiAddress: normalizeSuiAddress(row.payload.suiAddress),
    };
  } catch {
    return null;
  }
}

export function resetNativeHandoffStoreForTests(): void {
  memoryPending.clear();
  memoryConsumed.clear();
}
