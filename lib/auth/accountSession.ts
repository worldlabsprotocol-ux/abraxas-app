// FILE: lib/auth/accountSession.ts
// HttpOnly session for Abraxas native accounts — JWT + server-side session registry (revocation).

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { isNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import { getNativeAccountStatus, NativeAccountStoreUnavailableError } from "@/lib/auth/nativeAccount/store";
import {
  createAccountSessionId,
  insertAccountSessionRecord,
  isAccountSessionActive,
  revokeAccountSession,
} from "@/lib/auth/nativeAccount/accountSessionStore";

export const ACCOUNT_SESSION_COOKIE = "abraxas_account_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 14; // 14 days

/** Sign-out revokes only the current browser session (JWT `jti`), not all devices. */
export const ACCOUNT_SESSION_SIGN_OUT_SCOPE = "current_session_only" as const;

function sessionSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_ACCOUNT_SESSION_SECRET ?? process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export type AccountAuthMethod = "passkey" | "solana_wallet";

export interface AccountSession {
  accountId: string;
  authMethod: AccountAuthMethod;
  sessionId: string;
}

export async function issueAccountSessionToken(
  accountId: string,
  authMethod: AccountAuthMethod = "passkey",
): Promise<string | null> {
  if (!isNativeAccountId(accountId)) return null;
  const secret = sessionSecret();
  if (!secret) return null;

  const sessionId = createAccountSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000).toISOString();

  try {
    await insertAccountSessionRecord({
      sessionId,
      accountId,
      authMethod,
      expiresAt,
    });
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) return null;
    throw error;
  }

  return new SignJWT({
    typ: "abraxas_account_session",
    am: authMethod,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(accountId)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secret);
}

export function attachAccountSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(ACCOUNT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export function clearAccountSessionCookie(res: NextResponse): void {
  res.cookies.set(ACCOUNT_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function verifyAccountSessionJwt(token: string): Promise<{
  accountId: string;
  authMethod: AccountAuthMethod;
  sessionId: string;
} | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.typ !== "abraxas_account_session") return null;
    const accountId = typeof payload.sub === "string" ? payload.sub : null;
    const sessionId = typeof payload.jti === "string" ? payload.jti : null;
    if (!accountId || !sessionId || !isNativeAccountId(accountId)) return null;
    if (!/^acs_[0-9a-f]{32}$/.test(sessionId)) return null;

    const am = payload.am;
    const authMethod: AccountAuthMethod =
      am === "solana_wallet" || am === "passkey" ? am : "passkey";
    return { accountId, authMethod, sessionId };
  } catch {
    return null;
  }
}

export async function resolveAccountSession(req: NextRequest): Promise<AccountSession | null> {
  const token = req.cookies.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!token) return null;

  const parsed = await verifyAccountSessionJwt(token);
  if (!parsed) return null;

  try {
    const status = await getNativeAccountStatus(parsed.accountId);
    if (!status || status !== "active") return null;

    const active = await isAccountSessionActive({
      sessionId: parsed.sessionId,
      accountId: parsed.accountId,
    });
    if (!active) return null;
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) return null;
    throw error;
  }

  return {
    accountId: parsed.accountId,
    authMethod: parsed.authMethod,
    sessionId: parsed.sessionId,
  };
}

export async function revokeCurrentAccountSessionFromRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!token) return false;
  const parsed = await verifyAccountSessionJwt(token);
  if (!parsed) return false;
  try {
    return await revokeAccountSession({
      sessionId: parsed.sessionId,
      accountId: parsed.accountId,
      reason: "sign_out",
    });
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) return false;
    throw error;
  }
}

export async function requireAccountSession(req: NextRequest): Promise<
  | { ok: true; session: AccountSession }
  | { ok: false; error: string; status: 401 }
> {
  const session = await resolveAccountSession(req);
  if (!session) {
    return { ok: false, error: "Abraxas account sign-in required", status: 401 };
  }
  return { ok: true, session };
}
