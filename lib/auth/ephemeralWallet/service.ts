// FILE: lib/auth/ephemeralWallet/service.ts

import { PublicKey } from "@solana/web3.js";
import type { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  isAllowedPassportWalletOrigin,
  originsMatch,
} from "@/lib/auth/passportWalletAuth/origin";
import { verifyPassportSolanaPersonalMessage } from "@/lib/auth/passportSolanaAuth/verifySignature";
import { canonicalizeSolanaNetwork, resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";
import { buildEphemeralWalletSignInMessage } from "./message";
import {
  commitEphemeralWalletChallenge,
  hashEphemeralSessionContext,
  peekEphemeralWalletChallenge,
  putEphemeralWalletChallenge,
} from "./challengeStore";
import { WALLET_SOL_AUTH_CHALLENGE_TTL_MS, WALLET_SOL_AUTH_CONTEXT_COOKIE } from "./contract";
import { EphemeralStateUnavailableError } from "./errors";

export function createEphemeralWalletChallengeId(): string {
  return `ewch_${randomBytes(16).toString("hex")}`;
}

export async function issueEphemeralWalletAuthChallenge(input: {
  origin: string;
  uri: string;
  walletAddress: string;
  solanaNetwork: string;
  sessionContext: string;
}): Promise<
  | {
      ok: true;
      challenge: {
        challenge_id: string;
        message: string;
        expires_at: string;
        solana_network: string;
      };
      sessionContext: string;
    }
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
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + WALLET_SOL_AUTH_CHALLENGE_TTL_MS).toISOString();
  const nonce = randomBytes(16).toString("hex");
  const challengeId = createEphemeralWalletChallengeId();
  const domain = new URL(input.origin).host;
  const originNormalized = new URL(input.origin).origin;

  const message = buildEphemeralWalletSignInMessage({
    domain,
    walletAddress: wallet,
    uri: input.uri,
    solanaNetwork: canonicalNetwork,
    nonce,
    issuedAt,
    expiresAt,
    challengeId,
    origin: originNormalized,
  });

  try {
    await putEphemeralWalletChallenge(
      {
        challenge_id: challengeId,
        wallet_address: wallet,
        solana_network: canonicalNetwork,
        origin: originNormalized,
        uri: input.uri,
        session_context_hash: hashEphemeralSessionContext(input.sessionContext),
        nonce,
        message,
        expires_at: expiresAt,
      },
      Math.floor(WALLET_SOL_AUTH_CHALLENGE_TTL_MS / 1000),
    );
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }

  return {
    ok: true,
    sessionContext: input.sessionContext,
    challenge: {
      challenge_id: challengeId,
      message,
      expires_at: expiresAt,
      solana_network: canonicalNetwork,
    },
  };
}

export async function verifyEphemeralWalletAuth(input: {
  challengeId: string;
  walletAddress: string;
  solanaNetwork: string;
  signature: string;
  sessionContext: string;
  requestOrigin: string;
}): Promise<
  | { ok: true; walletAddress: string; solanaNetwork: string }
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
    row = await peekEphemeralWalletChallenge(input.challengeId);
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }
  if (!row) return { ok: false, code: "replay" };
  if (row.wallet_address !== wallet) return { ok: false, code: "wrong_signer" };
  if (row.session_context_hash !== hashEphemeralSessionContext(input.sessionContext)) {
    return { ok: false, code: "session_context_mismatch" };
  }
  if (new Date(row.expires_at) < new Date()) return { ok: false, code: "expired" };
  if (!originsMatch(row.origin, input.requestOrigin)) return { ok: false, code: "wrong_domain" };

  const valid = verifyPassportSolanaPersonalMessage({
    message: row.message,
    signature: input.signature,
    walletAddress: wallet,
  });
  if (!valid) return { ok: false, code: "invalid_signature" };

  let committed;
  try {
    committed = await commitEphemeralWalletChallenge(input.challengeId);
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }
  if (!committed) return { ok: false, code: "replay" };

  return { ok: true, walletAddress: wallet, solanaNetwork: canonicalNetwork };
}

export function attachWalletSolAuthContextCookie(res: NextResponse, sessionContext: string): void {
  res.cookies.set(WALLET_SOL_AUTH_CONTEXT_COOKIE, sessionContext, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(WALLET_SOL_AUTH_CHALLENGE_TTL_MS / 1000),
  });
}

export function readWalletSolAuthContextCookie(req: {
  cookies: { get: (n: string) => { value?: string } | undefined };
}): string | null {
  const raw = req.cookies.get(WALLET_SOL_AUTH_CONTEXT_COOKIE)?.value?.trim();
  return raw || null;
}

export function clearWalletSolAuthContextCookie(res: NextResponse): void {
  res.cookies.set(WALLET_SOL_AUTH_CONTEXT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
