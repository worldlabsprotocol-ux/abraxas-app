// FILE: lib/auth/passportSolanaAuth/service.ts

import { PublicKey } from "@solana/web3.js";
import type { NextResponse } from "next/server";
import {
  isAllowedPassportWalletOrigin,
  originsMatch,
} from "@/lib/auth/passportWalletAuth/origin";
import { HOLDER_AUTH_CHALLENGE_TTL_MS, HOLDER_AUTH_CONTEXT_COOKIE, type HolderAuthIntendedAction } from "@/lib/auth/holderSubject/contract";
import { caip10Solana } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWallet } from "@/lib/auth/holderSubject/service";
import { buildPassportSolanaAuthMessage } from "./message";
import { canonicalizeSolanaNetwork, resolveAuthorizedSolanaNetworkFromEnv } from "./network";
import {
  consumeSolanaChallenge,
  createChallengeId,
  hashSessionContext,
  insertSolanaChallenge,
  PassportSolanaAuthStoreUnavailableError,
} from "./store";
import { verifyPassportSolanaPersonalMessage } from "./verifySignature";
import { randomBytes } from "crypto";

export async function issuePassportSolanaAuthChallenge(input: {
  origin: string;
  walletAddress: string;
  solanaNetwork: string;
  intendedAction: HolderAuthIntendedAction;
  sessionContext: string;
}): Promise<
  | { ok: true; challenge: { challenge_id: string; message: string; expires_at: string; solana_network: string }; sessionContext: string }
  | { ok: false; code: string }
> {
  const authorized = resolveAuthorizedSolanaNetworkFromEnv();
  if (!authorized) return { ok: false, code: "network_config_invalid" };
  const canonicalNetwork = canonicalizeSolanaNetwork(input.solanaNetwork);
  if (!canonicalNetwork || canonicalNetwork !== authorized) return { ok: false, code: "wrong_network" };
  if (!isAllowedPassportWalletOrigin(input.origin)) return { ok: false, code: "wrong_origin" };

  let wallet: string;
  try {
    wallet = new PublicKey(input.walletAddress.trim()).toBase58();
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLDER_AUTH_CHALLENGE_TTL_MS).toISOString();
  const nonce = randomBytes(16).toString("hex");
  const challengeId = createChallengeId();
  const message = buildPassportSolanaAuthMessage({
    origin: new URL(input.origin).origin,
    walletAddress: wallet,
    solanaNetwork: canonicalNetwork,
    intendedAction: input.intendedAction,
    nonce,
    expiresAt,
    sessionContext: input.sessionContext,
  });

  try {
    await insertSolanaChallenge({
      id: challengeId,
      wallet_address: wallet,
      solana_network: canonicalNetwork,
      origin: new URL(input.origin).origin,
      intended_action: input.intendedAction,
      session_context_hash: hashSessionContext(input.sessionContext),
      nonce,
      message,
      expires_at: expiresAt,
    });
  } catch (error) {
    if (error instanceof PassportSolanaAuthStoreUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }

  return {
    ok: true,
    sessionContext: input.sessionContext,
    challenge: { challenge_id: challengeId, message, expires_at: expiresAt, solana_network: canonicalNetwork },
  };
}

export async function verifyPassportSolanaAuth(input: {
  challengeId: string;
  walletAddress: string;
  solanaNetwork: string;
  signature: string;
  sessionContext: string;
  requestOrigin: string;
  expectedIntendedAction: HolderAuthIntendedAction;
}): Promise<
  | { ok: true; holderSubjectId: string; caip10: string; created: boolean }
  | { ok: false; code: string }
> {
  const authorized = resolveAuthorizedSolanaNetworkFromEnv();
  if (!authorized) return { ok: false, code: "network_config_invalid" };
  const canonicalNetwork = canonicalizeSolanaNetwork(input.solanaNetwork);
  if (!canonicalNetwork || canonicalNetwork !== authorized) return { ok: false, code: "wrong_network" };

  let wallet: string;
  try {
    wallet = new PublicKey(input.walletAddress.trim()).toBase58();
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  let row;
  try {
    row = await consumeSolanaChallenge({
      challengeId: input.challengeId,
      walletAddress: wallet,
      sessionContextHash: hashSessionContext(input.sessionContext),
    });
  } catch (error) {
    if (error instanceof PassportSolanaAuthStoreUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }
  if (!row) return { ok: false, code: "replay" };
  if (new Date(row.expires_at) < new Date()) return { ok: false, code: "expired" };
  if (row.intended_action !== input.expectedIntendedAction) return { ok: false, code: "wrong_action" };
  if (!originsMatch(row.origin, input.requestOrigin)) return { ok: false, code: "wrong_domain" };

  const valid = verifyPassportSolanaPersonalMessage({
    message: row.message,
    signature: input.signature,
    walletAddress: wallet,
  });
  if (!valid) return { ok: false, code: "invalid_signature" };

  const caip = caip10Solana(row.solana_network, wallet);
  const subject = await resolveSubjectForVerifiedWallet({ caip, authMethod: "solana_wallet" });
  if (!subject.ok) return { ok: false, code: subject.code };

  return {
    ok: true,
    holderSubjectId: subject.subjectId,
    caip10: caip.caip10,
    created: subject.created,
  };
}

export function attachHolderAuthContextCookie(res: NextResponse, sessionContext: string): void {
  res.cookies.set(HOLDER_AUTH_CONTEXT_COOKIE, sessionContext, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(HOLDER_AUTH_CHALLENGE_TTL_MS / 1000),
  });
}

export function readHolderAuthContextCookie(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${HOLDER_AUTH_CONTEXT_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function clearHolderAuthContextCookie(res: NextResponse): void {
  res.cookies.set(HOLDER_AUTH_CONTEXT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
