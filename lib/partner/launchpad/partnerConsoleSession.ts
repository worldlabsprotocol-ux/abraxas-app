// FILE: lib/partner/launchpad/partnerConsoleSession.ts
// HttpOnly partner console session — never stores API key material in the browser.

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { resolvePartnerConsoleSessionSecret } from "@/lib/partner/launchpad/partnerConsoleSessionSecret";

export const PARTNER_CONSOLE_SESSION_COOKIE = "abraxas_partner_console_session";
const SESSION_TTL_SEC = 60 * 60 * 8;

export type PartnerConsoleAuthKind = "api_key" | "account";

export interface PartnerConsoleSession {
  partnerId: string;
  environment: "sandbox" | "production";
  authKind?: PartnerConsoleAuthKind;
  /** Present when established via API key sign-in. */
  apiKeyId?: string;
  /** Present when established via native account membership. */
  accountId?: string;
  membershipRole?: "owner" | "admin" | "operator";
}

function sessionSecret(): Uint8Array | null {
  return resolvePartnerConsoleSessionSecret();
}

export async function issuePartnerConsoleSessionToken(
  session: PartnerConsoleSession,
): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const authKind: PartnerConsoleAuthKind = session.accountId ? "account" : "api_key";
  if (authKind === "api_key" && !session.apiKeyId) return null;
  if (authKind === "account" && !session.accountId) return null;

  return new SignJWT({
    partner_id: session.partnerId,
    ...(session.apiKeyId ? { api_key_id: session.apiKeyId } : {}),
    ...(session.accountId ? { account_id: session.accountId, membership_role: session.membershipRole } : {}),
    auth_kind: authKind,
    environment: session.environment,
    typ: "partner_console_session",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.partnerId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secret);
}

export function attachPartnerConsoleSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(PARTNER_CONSOLE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export function clearPartnerConsoleSessionCookie(res: NextResponse): void {
  res.cookies.set(PARTNER_CONSOLE_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function resolvePartnerConsoleSession(
  req: NextRequest,
): Promise<PartnerConsoleSession | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const token = req.cookies.get(PARTNER_CONSOLE_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.typ !== "partner_console_session") return null;
    const partnerId = typeof payload.partner_id === "string" ? payload.partner_id : payload.sub;
    const apiKeyId = typeof payload.api_key_id === "string" ? payload.api_key_id : undefined;
    const accountId = typeof payload.account_id === "string" ? payload.account_id : undefined;
    const authKind: PartnerConsoleAuthKind =
      payload.auth_kind === "account" || accountId ? "account" : "api_key";
    const environment = payload.environment === "production" ? "production" : "sandbox";
    if (!partnerId) return null;
    if (authKind === "api_key" && !apiKeyId) return null;
    if (authKind === "account" && !accountId) return null;

    if (authKind === "account" && accountId) {
      const { assertPartnerMembership } = await import("@/lib/auth/nativeAccount/store");
      const membership = await assertPartnerMembership(accountId, partnerId);
      if (!membership.ok) return null;
    }

    return {
      partnerId,
      environment,
      authKind,
      apiKeyId,
      accountId,
      membershipRole:
        payload.membership_role === "admin" || payload.membership_role === "operator"
          ? payload.membership_role
          : accountId
            ? "owner"
            : undefined,
    };
  } catch {
    return null;
  }
}

export async function requirePartnerConsoleSession(req: NextRequest): Promise<
  | { ok: true; session: PartnerConsoleSession }
  | { ok: false; error: string; status: 401 | 403 }
> {
  const session = await resolvePartnerConsoleSession(req);
  if (!session) {
    return { ok: false, error: "Partner console sign in required", status: 401 };
  }
  return { ok: true, session };
}
