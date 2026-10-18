// FILE: lib/auth/nativeAccount/solanaAuth/service.ts

import { PublicKey } from "@solana/web3.js";
import type { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  isAllowedPassportWalletOrigin,
  originsMatch,
} from "@/lib/auth/passportWalletAuth/origin";
import { verifyPassportSolanaPersonalMessage } from "@/lib/auth/passportSolanaAuth/verifySignature";
import { canonicalizeSolanaNetwork, resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";
import { createNativeAccountId } from "../subjectId";
import { insertNativeAccount } from "../store";
import { NativeAccountStoreUnavailableError } from "../storeErrors";
import { ACCOUNT_SOL_AUTH_CHALLENGE_TTL_MS, ACCOUNT_SOL_AUTH_CONTEXT_COOKIE } from "./contract";
import { buildAccountSolanaSignInMessage } from "./message";
import {
  consumeAccountSolanaChallenge,
  createAccountSolChallengeId,
  findAccountIdBySolanaWallet,
  hashAccountSolSessionContext,
  insertAccountSolanaChallenge,
  linkSolanaWalletToAccount,
  touchSolanaWalletLastUsed,
} from "./store";

export async function issueAccountSolanaAuthChallenge(input: {
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
  const expiresAt = new Date(now.getTime() + ACCOUNT_SOL_AUTH_CHALLENGE_TTL_MS).toISOString();
  const nonce = randomBytes(16).toString("hex");
  const requestId = randomBytes(12).toString("hex");
  const challengeId = createAccountSolChallengeId();
  const domain = new URL(input.origin).host;

  const message = buildAccountSolanaSignInMessage({
    domain,
    walletAddress: wallet,
    uri: input.uri,
    solanaNetwork: canonicalNetwork,
    nonce,
    issuedAt,
    expiresAt,
    requestId,
  });

  try {
    await insertAccountSolanaChallenge({
      id: challengeId,
      wallet_address: wallet,
      solana_network: canonicalNetwork,
      origin: new URL(input.origin).origin,
      uri: input.uri,
      request_id: requestId,
      session_context_hash: hashAccountSolSessionContext(input.sessionContext),
      nonce,
      message,
      expires_at: expiresAt,
    });
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) return { ok: false, code: "store_unavailable" };
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

export async function verifyAccountSolanaAuth(input: {
  challengeId: string;
  walletAddress: string;
  solanaNetwork: string;
  signature: string;
  sessionContext: string;
  requestOrigin: string;
}): Promise<
  | { ok: true; accountId: string; walletAddress: string; created: boolean }
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
    row = await consumeAccountSolanaChallenge({
      challengeId: input.challengeId,
      walletAddress: wallet,
      sessionContextHash: hashAccountSolSessionContext(input.sessionContext),
    });
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }
  if (!row) return { ok: false, code: "replay" };
  if (new Date(row.expires_at) < new Date()) return { ok: false, code: "expired" };
  if (!originsMatch(row.origin, input.requestOrigin)) return { ok: false, code: "wrong_domain" };

  const valid = verifyPassportSolanaPersonalMessage({
    message: row.message,
    signature: input.signature,
    walletAddress: wallet,
  });
  if (!valid) return { ok: false, code: "invalid_signature" };

  let accountId = await findAccountIdBySolanaWallet(wallet, canonicalNetwork);
  let created = false;
  if (!accountId) {
    accountId = createNativeAccountId();
    await insertNativeAccount(accountId);
    await linkSolanaWalletToAccount({
      accountId,
      walletAddress: wallet,
      solanaNetwork: canonicalNetwork,
    });
    created = true;
  } else {
    await touchSolanaWalletLastUsed(wallet, canonicalNetwork);
  }

  return { ok: true, accountId, walletAddress: wallet, created };
}

export function attachAccountSolAuthContextCookie(res: NextResponse, sessionContext: string): void {
  res.cookies.set(ACCOUNT_SOL_AUTH_CONTEXT_COOKIE, sessionContext, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ACCOUNT_SOL_AUTH_CHALLENGE_TTL_MS / 1000),
  });
}

export function readAccountSolAuthContextCookie(req: { cookies: { get: (n: string) => { value?: string } | undefined } }): string | null {
  const raw = req.cookies.get(ACCOUNT_SOL_AUTH_CONTEXT_COOKIE)?.value?.trim();
  return raw || null;
}

export function clearAccountSolAuthContextCookie(res: NextResponse): void {
  res.cookies.set(ACCOUNT_SOL_AUTH_CONTEXT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
