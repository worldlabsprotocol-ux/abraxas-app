// FILE: lib/sui/zklogin/oauthLoginState.ts
// Signed, single-use OAuth state for zkLogin login mode binding (server-only trust).

import { randomBytes } from "crypto";
import { errors, SignJWT, jwtVerify } from "jose";
import type { ZkLoginLoginMode } from "./audienceCohorts";
import type { HolderAuthPlatform } from "./holderPlatform";

export const ZKLOGIN_OAUTH_STATE_COOKIE = "abraxas_zklogin_oauth_state";
export const ZKLOGIN_OAUTH_STATE_TYP = "zklogin_oauth_state";
export const ZKLOGIN_OAUTH_STATE_TTL_SEC = 10 * 60;

export const ZKLOGIN_SIGN_IN_EXPIRED_MESSAGE =
  "Sign-in expired—please try again";

type ConsumeFailureReason =
  | "missing"
  | "tampered"
  | "expired"
  | "replayed"
  | "cookie_mismatch"
  | "misconfigured"
  | "store_unavailable";

export type MintZkLoginOAuthStateResult = {
  oauthState: string;
  jti: string;
};

export type ConsumeZkLoginOAuthStateResult =
  | { ok: true; mode: ZkLoginLoginMode; jti: string; holderPlatform: HolderAuthPlatform | null }
  | { ok: false; reason: ConsumeFailureReason };

function parseHolderPlatform(raw: unknown): HolderAuthPlatform | null {
  if (raw === "android_native" || raw === "ios_native") return raw;
  return null;
}

function stateSecret(): Uint8Array | null {
  const raw =
    process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    ?? process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

function parseLoginMode(raw: unknown): ZkLoginLoginMode {
  return raw === "legacy_recovery" ? "legacy_recovery" : "canonical";
}

export function resetZkLoginOAuthStateForTests(): void {
  // OAuth state is stateless; JTI replay store reset lives in oauthJtiReplayStore tests.
}

export async function mintZkLoginOAuthState(
  modeInput: unknown,
  holderPlatformInput?: unknown,
): Promise<MintZkLoginOAuthStateResult | null> {
  const secret = stateSecret();
  if (!secret) return null;

  const mode = parseLoginMode(modeInput);
  const holderPlatform = parseHolderPlatform(holderPlatformInput);
  const jti = randomBytes(24).toString("base64url");

  const oauthState = await new SignJWT({
    typ: ZKLOGIN_OAUTH_STATE_TYP,
    mode,
    jti,
    ...(holderPlatform ? { holder_platform: holderPlatform } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${ZKLOGIN_OAUTH_STATE_TTL_SEC}s`)
    .sign(secret);

  return { oauthState, jti };
}

export async function consumeZkLoginOAuthState(
  oauthState: string | null | undefined,
  cookieJti: string | null | undefined,
): Promise<ConsumeZkLoginOAuthStateResult> {
  const secret = stateSecret();
  if (!secret) return { ok: false, reason: "misconfigured" };

  const token = oauthState?.trim();
  if (!token) return { ok: false, reason: "missing" };

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as Record<string, unknown>;
  } catch (e) {
    if (e instanceof errors.JWTExpired) {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "tampered" };
  }

  if (payload.typ !== ZKLOGIN_OAUTH_STATE_TYP) {
    return { ok: false, reason: "tampered" };
  }

  const jti = typeof payload.jti === "string" ? payload.jti : null;
  const mode = payload.mode === "legacy_recovery" ? "legacy_recovery" : payload.mode === "canonical" ? "canonical" : null;
  const holderPlatform = parseHolderPlatform(payload.holder_platform);

  if (!jti || !mode) return { ok: false, reason: "tampered" };

  const verifier = cookieJti?.trim();
  const nativeHandoff = holderPlatform !== null;
  if (!nativeHandoff) {
    if (!verifier) return { ok: false, reason: "cookie_mismatch" };
    if (jti !== verifier) return { ok: false, reason: "cookie_mismatch" };
  }

  const exp = payload.exp;
  const expiresAtIso = typeof exp === "number"
    ? new Date(exp * 1000).toISOString()
    : new Date(Date.now() + ZKLOGIN_OAUTH_STATE_TTL_SEC * 1000).toISOString();

  const { consumeZkLoginOAuthJti } = await import("./oauthJtiReplayStore");
  const consumed = await consumeZkLoginOAuthJti({ jti, expiresAtIso });
  if (!consumed.ok) {
    if (consumed.reason === "replayed") {
      return { ok: false, reason: "replayed" };
    }
    return { ok: false, reason: "store_unavailable" };
  }

  return { ok: true, mode, jti, holderPlatform };
}

export async function inspectZkLoginOAuthState(
  oauthState: string | null | undefined,
): Promise<{
  mode: ZkLoginLoginMode;
  holderPlatform: HolderAuthPlatform | null;
  jti: string;
} | null> {
  const secret = stateSecret();
  if (!secret) return null;
  const token = oauthState?.trim();
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, secret);
    const payload = verified.payload as Record<string, unknown>;
    if (payload.typ !== ZKLOGIN_OAUTH_STATE_TYP) return null;
    const jti = typeof payload.jti === "string" ? payload.jti : null;
    const mode = payload.mode === "legacy_recovery" ? "legacy_recovery" : payload.mode === "canonical" ? "canonical" : null;
    if (!jti || !mode) return null;
    return {
      mode,
      holderPlatform: parseHolderPlatform(payload.holder_platform),
      jti,
    };
  } catch {
    return null;
  }
}

export function parseOAuthStateFromCallbackHash(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const params = new URLSearchParams(hash.slice(1));
  const state = params.get("state");
  return state?.trim() || null;
}

export function attachZkLoginOAuthStateCookie(
  res: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } },
  jti: string,
): void {
  res.cookies.set(ZKLOGIN_OAUTH_STATE_COOKIE, jti, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ZKLOGIN_OAUTH_STATE_TTL_SEC,
  });
}

export function clearZkLoginOAuthStateCookie(
  res: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } },
): void {
  res.cookies.set(ZKLOGIN_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
