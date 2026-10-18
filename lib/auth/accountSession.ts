// FILE: lib/auth/accountSession.ts
// HttpOnly session for Abraxas native accounts (passkey) — separate from Passport holder session.

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { isNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import { getNativeAccountStatus, NativeAccountStoreUnavailableError } from "@/lib/auth/nativeAccount/store";

export const ACCOUNT_SESSION_COOKIE = "abraxas_account_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 14; // 14 days

function sessionSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_ACCOUNT_SESSION_SECRET ?? process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export type AccountAuthMethod = "passkey" | "solana_wallet";

export interface AccountSession {
  accountId: string;
  authMethod: AccountAuthMethod;
}

export async function issueAccountSessionToken(
  accountId: string,
  authMethod: AccountAuthMethod = "passkey",
): Promise<string | null> {
  if (!isNativeAccountId(accountId)) return null;
  const secret = sessionSecret();
  if (!secret) return null;

  return new SignJWT({
    typ: "abraxas_account_session",
    am: authMethod,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(accountId)
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

export async function resolveAccountSession(req: NextRequest): Promise<AccountSession | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const token = req.cookies.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.typ !== "abraxas_account_session") return null;
    const accountId = typeof payload.sub === "string" ? payload.sub : null;
    if (!accountId || !isNativeAccountId(accountId)) return null;

    try {
      const status = await getNativeAccountStatus(accountId);
      if (!status || status !== "active") return null;
    } catch (error) {
      if (error instanceof NativeAccountStoreUnavailableError) return null;
      throw error;
    }

    const am = payload.am;
    const authMethod: AccountAuthMethod =
      am === "solana_wallet" || am === "passkey" ? am : "passkey";
    return { accountId, authMethod };
  } catch {
    return null;
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
