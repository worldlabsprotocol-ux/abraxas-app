// FILE: lib/auth/ephemeralWallet/walletSession.ts

import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  isEphemeralWalletSessionActive,
  registerEphemeralWalletSessionActive,
  revokeEphemeralWalletSession,
} from "./sessionStore";
import { defaultEphemeralWalletScopes, type EphemeralWalletScope } from "./scopes";
import { EphemeralStateUnavailableError } from "./errors";
import { EPHEMERAL_TTL } from "./retention";
import {
  EPHEMERAL_WALLET_JWT_AUDIENCE,
  EPHEMERAL_WALLET_JWT_ISSUER,
} from "./contract";

export const WALLET_SESSION_COOKIE = "abraxas_wallet_session";
export const WALLET_SESSION_TTL_SEC = EPHEMERAL_TTL.walletSessionSec;

function ephemeralWalletEnvBinding(): string {
  return (
    process.env.VERCEL_ENV?.trim()
    || process.env.ABRAXAS_DEPLOYMENT_ENV?.trim()
    || process.env.NODE_ENV
    || "development"
  );
}

function sessionSecret(): Uint8Array | null {
  const raw =
    process.env.ABRAXAS_ACCOUNT_SESSION_SECRET?.trim()
    || process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    || process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!raw || raw.length < 32) return null;
  return new TextEncoder().encode(raw);
}

export type EphemeralWalletSession = {
  walletAddress: string;
  solanaNetwork: string;
  sessionId: string;
  scopes: EphemeralWalletScope[];
};

export function createEphemeralWalletSessionId(): string {
  return `ewss_${randomBytes(16).toString("hex")}`;
}

export function isValidSolanaWalletAddress(address: string): boolean {
  try {
    new PublicKey(address.trim());
    return true;
  } catch {
    return false;
  }
}

export async function issueEphemeralWalletSessionToken(input: {
  walletAddress: string;
  solanaNetwork: string;
  sessionId?: string;
  scopes?: EphemeralWalletScope[];
}): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret || !isValidSolanaWalletAddress(input.walletAddress)) return null;

  const sessionId = input.sessionId ?? createEphemeralWalletSessionId();
  const scopes = input.scopes ?? defaultEphemeralWalletScopes();

  try {
    await registerEphemeralWalletSessionActive(sessionId, WALLET_SESSION_TTL_SEC);
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) return null;
    throw error;
  }

  return new SignJWT({
    typ: "abraxas_ephemeral_wallet_session",
    scp: scopes,
    net: input.solanaNetwork,
    am: "solana_wallet",
    env: ephemeralWalletEnvBinding(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.walletAddress.trim())
    .setJti(sessionId)
    .setIssuer(EPHEMERAL_WALLET_JWT_ISSUER)
    .setAudience(EPHEMERAL_WALLET_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${WALLET_SESSION_TTL_SEC}s`)
    .sign(secret);
}

export function attachWalletSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(WALLET_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: WALLET_SESSION_TTL_SEC,
  });
}

export function clearWalletSessionCookie(res: NextResponse): void {
  res.cookies.set(WALLET_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function verifyWalletSessionJwt(token: string): Promise<EphemeralWalletSession | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: EPHEMERAL_WALLET_JWT_ISSUER,
      audience: EPHEMERAL_WALLET_JWT_AUDIENCE,
    });
    if (payload.typ !== "abraxas_ephemeral_wallet_session") return null;
    const envClaim = typeof payload.env === "string" ? payload.env : null;
    if (!envClaim || envClaim !== ephemeralWalletEnvBinding()) return null;
    const walletAddress = typeof payload.sub === "string" ? payload.sub : null;
    const sessionId = typeof payload.jti === "string" ? payload.jti : null;
    const solanaNetwork = typeof payload.net === "string" ? payload.net : null;
    if (!walletAddress || !sessionId || !solanaNetwork) return null;
    if (!/^ewss_[0-9a-f]{32}$/.test(sessionId)) return null;
    if (!isValidSolanaWalletAddress(walletAddress)) return null;

    const rawScopes = payload.scp;
    const scopes = Array.isArray(rawScopes)
      ? rawScopes.filter((s): s is EphemeralWalletScope => typeof s === "string")
      : defaultEphemeralWalletScopes();

    return { walletAddress, solanaNetwork, sessionId, scopes };
  } catch {
    return null;
  }
}

export async function resolveEphemeralWalletSession(
  req: NextRequest,
): Promise<EphemeralWalletSession | null> {
  const token = req.cookies.get(WALLET_SESSION_COOKIE)?.value;
  if (!token) return null;

  const parsed = await verifyWalletSessionJwt(token);
  if (!parsed) return null;

  try {
    const active = await isEphemeralWalletSessionActive(parsed.sessionId);
    if (!active) return null;
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) return null;
    throw error;
  }

  return parsed;
}

export async function revokeEphemeralWalletSessionFromRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(WALLET_SESSION_COOKIE)?.value;
  if (!token) return false;
  const parsed = await verifyWalletSessionJwt(token);
  if (!parsed) return false;
  try {
    return await revokeEphemeralWalletSession(parsed.sessionId);
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) return false;
    throw error;
  }
}

export async function requireEphemeralWalletScope(
  req: NextRequest,
  scope: EphemeralWalletScope,
): Promise<
  | { ok: true; session: EphemeralWalletSession }
  | { ok: false; error: string; status: 401 | 403 | 503 }
> {
  let session: EphemeralWalletSession | null;
  try {
    session = await resolveEphemeralWalletSession(req);
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) {
      return { ok: false, error: "ephemeral_state_unavailable", status: 503 };
    }
    throw error;
  }
  if (!session) {
    return { ok: false, error: "wallet_sign_in_required", status: 401 };
  }
  if (!session.scopes.includes(scope)) {
    return { ok: false, error: "insufficient_scope", status: 403 };
  }
  return { ok: true, session };
}
