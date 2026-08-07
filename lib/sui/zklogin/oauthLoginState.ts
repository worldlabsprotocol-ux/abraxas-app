// FILE: lib/sui/zklogin/oauthLoginState.ts
// Signed, single-use OAuth state for zkLogin login mode binding (server-only trust).

import { randomBytes } from "crypto";
import { errors, SignJWT, jwtVerify } from "jose";
import type { ZkLoginLoginMode } from "./audienceCohorts";

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
  | "misconfigured";

export type MintZkLoginOAuthStateResult = {
  oauthState: string;
  jti: string;
};

export type ConsumeZkLoginOAuthStateResult =
  | { ok: true; mode: ZkLoginLoginMode; jti: string }
  | { ok: false; reason: ConsumeFailureReason };

const consumedJtis = new Map<string, number>();

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

function pruneConsumedJtis(nowMs = Date.now()): void {
  const horizon = nowMs - ZKLOGIN_OAUTH_STATE_TTL_SEC * 1000;
  consumedJtis.forEach((consumedAt, jti) => {
    if (consumedAt < horizon) consumedJtis.delete(jti);
  });
}

export function resetZkLoginOAuthStateForTests(): void {
  consumedJtis.clear();
}

export async function mintZkLoginOAuthState(
  modeInput: unknown,
): Promise<MintZkLoginOAuthStateResult | null> {
  const secret = stateSecret();
  if (!secret) return null;

  const mode = parseLoginMode(modeInput);
  const jti = randomBytes(24).toString("base64url");

  const oauthState = await new SignJWT({
    typ: ZKLOGIN_OAUTH_STATE_TYP,
    mode,
    jti,
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

  const verifier = cookieJti?.trim();
  if (!verifier) return { ok: false, reason: "cookie_mismatch" };

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

  if (!jti || !mode) return { ok: false, reason: "tampered" };
  if (jti !== verifier) return { ok: false, reason: "cookie_mismatch" };

  pruneConsumedJtis();
  if (consumedJtis.has(jti)) {
    return { ok: false, reason: "replayed" };
  }

  consumedJtis.set(jti, Date.now());
  return { ok: true, mode, jti };
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
