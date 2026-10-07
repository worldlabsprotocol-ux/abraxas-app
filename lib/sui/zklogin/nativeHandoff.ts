// FILE: lib/sui/zklogin/nativeHandoff.ts
// Single-use native holder handoff tokens — bridge Custom Tab auth back into WebView.

import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const NATIVE_HANDOFF_QUERY = "holder_native_handoff";
export const NATIVE_HANDOFF_TYP = "zklogin_native_handoff";
export const NATIVE_HANDOFF_TTL_SEC = 5 * 60;

const TABLE = "zklogin_native_handoff_consumed";
const memoryConsumed = new Set<string>();

function handoffSecret(): Uint8Array | null {
  const raw =
    process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    ?? process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

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

function hashHandoffJti(jti: string): string {
  return createHash("sha256").update(`zklogin_native_handoff:${jti.trim()}`, "utf8").digest("hex");
}

export async function mintNativeHandoffToken(input: {
  suiAddress: string;
  email?: string | null;
  provider?: string;
}): Promise<string | null> {
  const secret = handoffSecret();
  if (!secret) return null;

  const sui = normalizeSuiAddress(input.suiAddress);
  const jti = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + NATIVE_HANDOFF_TTL_SEC * 1000).toISOString();

  const token = await new SignJWT({
    typ: NATIVE_HANDOFF_TYP,
    sui,
    email: input.email ?? undefined,
    provider: input.provider ?? "google",
    jti,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${NATIVE_HANDOFF_TTL_SEC}s`)
    .sign(secret);

  if (skipDurableStore()) {
    memoryConsumed.delete(hashHandoffJti(jti));
    return token;
  }

  try {
    const sb = requireSupabaseAdmin();
    await sb.from(TABLE).delete().lt("expires_at", new Date().toISOString());
  } catch {
    // best-effort purge
  }

  void expiresAt;
  return token;
}

export type VerifiedNativeHandoff = {
  suiAddress: string;
  email?: string;
  provider: string;
};

export async function verifyAndConsumeNativeHandoffToken(
  token: string | null | undefined,
): Promise<VerifiedNativeHandoff | null> {
  const secret = handoffSecret();
  if (!secret) return null;

  const raw = token?.trim();
  if (!raw) return null;

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(raw, secret);
    payload = verified.payload as Record<string, unknown>;
  } catch {
    return null;
  }

  if (payload.typ !== NATIVE_HANDOFF_TYP) return null;
  const jti = typeof payload.jti === "string" ? payload.jti : null;
  const sui = typeof payload.sui === "string" ? payload.sui : null;
  if (!jti || !sui) return null;

  const jtiHash = hashHandoffJti(jti);
  const expiresAtIso = typeof payload.exp === "number"
    ? new Date(payload.exp * 1000).toISOString()
    : new Date(Date.now() + NATIVE_HANDOFF_TTL_SEC * 1000).toISOString();

  if (skipDurableStore()) {
    if (memoryConsumed.has(jtiHash)) return null;
    memoryConsumed.add(jtiHash);
  } else {
    try {
      const sb = requireSupabaseAdmin();
      const { error } = await sb.from(TABLE).insert({
        jti_hash: jtiHash,
        expires_at: expiresAtIso,
      });
      if (error) {
        if ((error as { code?: string }).code === "23505") return null;
        if (isProductionRuntime()) return null;
        if (memoryConsumed.has(jtiHash)) return null;
        memoryConsumed.add(jtiHash);
      } else {
        memoryConsumed.add(jtiHash);
      }
    } catch {
      if (isProductionRuntime()) return null;
      if (memoryConsumed.has(jtiHash)) return null;
      memoryConsumed.add(jtiHash);
    }
  }

  let normalized: string;
  try {
    normalized = normalizeSuiAddress(sui);
  } catch {
    return null;
  }

  const email = typeof payload.email === "string" && payload.email.includes("@")
    ? payload.email
    : undefined;
  const provider = typeof payload.provider === "string" ? payload.provider : "google";

  return { suiAddress: normalized, email, provider };
}

export function resetNativeHandoffStoreForTests(): void {
  memoryConsumed.clear();
}
