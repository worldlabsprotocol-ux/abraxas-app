// FILE: lib/auth/browserSession.ts
// Signed httpOnly browser session for first-party flows (Cielo, Passport APIs).
// End users never send partner API keys — session cookie carries sui_address.

import { SignJWT, jwtVerify } from "jose";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

export const BROWSER_SESSION_COOKIE = "abraxas_browser_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function sessionSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export interface BrowserSession {
  suiAddress: string;
}

export async function issueBrowserSessionToken(suiAddress: string): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const subject = normalizeSuiAddress(suiAddress);
  return new SignJWT({ sui: subject })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secret);
}

export function attachBrowserSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(BROWSER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function resolveBrowserSession(req: NextRequest): Promise<BrowserSession | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const token =
    req.cookies.get(BROWSER_SESSION_COOKIE)?.value ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!token || token.startsWith("abx_")) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const sui = typeof payload.sui === "string" ? payload.sui : payload.sub;
    if (!sui) return null;
    const normalized = normalizeSuiAddress(sui);

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (sbUrl && sbKey) {
      const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
      const { data } = await sb
        .from("sui_zklogin_identities")
        .select("sui_address")
        .eq("sui_address", normalized)
        .maybeSingle();
      if (!data) return null;
    }

    return { suiAddress: normalized };
  } catch {
    return null;
  }
}

export async function requireBrowserSession(req: NextRequest): Promise<
  | { ok: true; session: BrowserSession }
  | { ok: false; error: string; status: 401 }
> {
  const session = await resolveBrowserSession(req);
  if (!session) {
    return { ok: false, error: "Sign in required", status: 401 };
  }
  return { ok: true, session };
}
