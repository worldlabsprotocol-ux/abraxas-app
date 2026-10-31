// FILE: lib/auth/browserSession.ts
// Signed httpOnly browser session for first-party flows (Passport, Partner Flow).

import { SignJWT, jwtVerify } from "jose";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import { assertHolderSubjectExists, resolveVerifiedWalletSubjectId } from "@/lib/auth/holderSubject/service";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";

export const BROWSER_SESSION_COOKIE = "abraxas_browser_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function sessionSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export type BrowserSessionAuthMethod = "wallet" | "oauth" | "hosted" | "evm_wallet" | "solana_wallet";

export interface BrowserSession {
  /** Canonical holder key for credentials, partner flow, and rate limits. */
  subjectId: string;
  /** Chain-neutral Abraxas holder subject (preferred). */
  holderSubjectId?: string;
  /** Legacy Sui-centric subject key; retained for zkLogin / historical credentials. */
  suiAddress?: string;
  authMethod?: BrowserSessionAuthMethod;
  walletCaip10?: string;
}

function finalizeBrowserSession(
  session: Omit<BrowserSession, "subjectId">,
): BrowserSession | null {
  const subjectId =
    session.holderSubjectId && isChainNeutralHolderSubjectId(session.holderSubjectId)
      ? session.holderSubjectId
      : session.suiAddress
        ? normalizeSuiAddress(session.suiAddress)
        : null;
  if (!subjectId) return null;
  return { ...session, subjectId };
}

export type IssueBrowserSessionInput = {
  authMethod: BrowserSessionAuthMethod;
  holderSubjectId?: string;
  legacySuiAddress?: string;
  walletCaip10?: string;
};

export async function issueBrowserSessionFromInput(input: IssueBrowserSessionInput): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const holderSubjectId = input.holderSubjectId?.trim();
  const legacySui = input.legacySuiAddress?.trim();

  let jwtSubject: string;
  if (holderSubjectId && isChainNeutralHolderSubjectId(holderSubjectId)) {
    jwtSubject = holderSubjectId;
  } else if (legacySui) {
    jwtSubject = normalizeSuiAddress(legacySui);
  } else {
    return null;
  }

  const jwt = new SignJWT({
    ...(holderSubjectId ? { hs: holderSubjectId } : {}),
    ...(legacySui ? { sui: normalizeSuiAddress(legacySui) } : {}),
    ...(input.walletCaip10 ? { wcaip: input.walletCaip10 } : {}),
    am: input.authMethod,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(jwtSubject)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`);
  return jwt.sign(secret);
}

/** @deprecated Prefer issueBrowserSessionFromInput for chain-neutral sessions. */
export async function issueBrowserSessionToken(
  suiAddress: string,
  options?: { authMethod?: BrowserSessionAuthMethod },
): Promise<string | null> {
  return issueBrowserSessionFromInput({
    legacySuiAddress: suiAddress,
    authMethod: options?.authMethod ?? "oauth",
  });
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
    const holderSubjectId = typeof payload.hs === "string" ? payload.hs : undefined;
    const suiRaw = typeof payload.sui === "string" ? payload.sui : undefined;
    const authMethod = payload.am === "wallet" || payload.am === "oauth" || payload.am === "hosted"
      || payload.am === "evm_wallet" || payload.am === "solana_wallet"
      ? payload.am
      : undefined;
    const walletCaip10 = typeof payload.wcaip === "string" ? payload.wcaip : undefined;

    if (holderSubjectId && isChainNeutralHolderSubjectId(holderSubjectId)) {
      if (await assertHolderSubjectExists(holderSubjectId)) {
        if (authMethod === "solana_wallet") {
          if (!walletCaip10?.startsWith("solana:")
            || await resolveVerifiedWalletSubjectId(walletCaip10) !== holderSubjectId) return null;
        }
        return finalizeBrowserSession({
          holderSubjectId,
          suiAddress: suiRaw ? normalizeSuiAddress(suiRaw) : undefined,
          authMethod,
          walletCaip10,
        });
      }
      return null;
    }

    const sui = suiRaw ?? (typeof payload.sub === "string" ? payload.sub : undefined);
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

    return finalizeBrowserSession({ suiAddress: normalized, authMethod, walletCaip10 });
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
    return { ok: false, error: "Sign in required in this browser", status: 401 };
  }
  if (!session.subjectId) {
    return { ok: false, error: "Sign in required in this browser", status: 401 };
  }
  return { ok: true, session };
}
