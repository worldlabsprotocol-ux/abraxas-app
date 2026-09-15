// FILE: lib/partner/launchpad/partnerConsoleSession.ts
// HttpOnly partner console session — never stores API key material in the browser.

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";

export const PARTNER_CONSOLE_SESSION_COOKIE = "abraxas_partner_console_session";
const SESSION_TTL_SEC = 60 * 60 * 8;

export interface PartnerConsoleSession {
  partnerId: string;
  apiKeyId: string;
  environment: "sandbox" | "production";
}

function sessionSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    ?? process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export async function issuePartnerConsoleSessionToken(
  session: PartnerConsoleSession,
): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  return new SignJWT({
    partner_id: session.partnerId,
    api_key_id: session.apiKeyId,
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
    const apiKeyId = typeof payload.api_key_id === "string" ? payload.api_key_id : null;
    const environment = payload.environment === "production" ? "production" : "sandbox";
    if (!partnerId || !apiKeyId) return null;
    return { partnerId, apiKeyId, environment };
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
