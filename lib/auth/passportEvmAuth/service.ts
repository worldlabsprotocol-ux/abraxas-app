// FILE: lib/auth/passportEvmAuth/service.ts

import { getAddress } from "viem";
import type { NextResponse } from "next/server";
import { buildSiweMessage, verifyEvmBindingSignature } from "@/lib/walletAuthority/evmSiwe";
import {
  assertPassportWalletSameOriginRequest,
  isAllowedPassportWalletOrigin,
  originsMatch,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { HOLDER_AUTH_CHALLENGE_TTL_MS, HOLDER_AUTH_CONTEXT_COOKIE, type HolderAuthIntendedAction } from "./contract";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWallet } from "@/lib/auth/holderSubject/service";
import { consumeEvmChallenge, createChallengeId, hashSessionContext, insertEvmChallenge, PassportEvmAuthStoreUnavailableError } from "./store";
import { resolveAuthorizedEvmChainIdFromEnv } from "./network";

function siweDomainFromOrigin(origin: string): string {
  return new URL(origin).hostname;
}

export async function issuePassportEvmAuthChallenge(input: {
  origin: string;
  walletAddress: string;
  chainId: number;
  intendedAction: HolderAuthIntendedAction;
  sessionContext: string;
}): Promise<
  | { ok: true; challenge: { challenge_id: string; message: string; expires_at: string; chain_id: number }; sessionContext: string }
  | { ok: false; code: string }
> {
  const authorizedChain = resolveAuthorizedEvmChainIdFromEnv();
  if (authorizedChain === null) return { ok: false, code: "network_config_invalid" };
  if (input.chainId !== authorizedChain) return { ok: false, code: "wrong_network" };
  if (!isAllowedPassportWalletOrigin(input.origin)) return { ok: false, code: "wrong_origin" };

  let wallet: string;
  try {
    wallet = getAddress(input.walletAddress.trim());
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLDER_AUTH_CHALLENGE_TTL_MS).toISOString();
  const nonce = createChallengeId();
  const challengeId = createChallengeId();
  const domain = siweDomainFromOrigin(input.origin);
  const message = buildSiweMessage({
    domain,
    address: wallet,
    chainId: input.chainId,
    nonce,
    issuedAt: now.toISOString(),
    expirationTime: expiresAt,
    statement: `Abraxas Passport authentication (${input.intendedAction}). Session:${input.sessionContext.slice(0, 16)}`,
  });

  try {
    await insertEvmChallenge({
      id: challengeId,
      wallet_address: wallet,
      chain_id: input.chainId,
      origin: new URL(input.origin).origin,
      intended_action: input.intendedAction,
      session_context_hash: hashSessionContext(input.sessionContext),
      nonce,
      message,
      expires_at: expiresAt,
    });
  } catch (error) {
    if (error instanceof PassportEvmAuthStoreUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }

  return {
    ok: true,
    sessionContext: input.sessionContext,
    challenge: { challenge_id: challengeId, message, expires_at: expiresAt, chain_id: input.chainId },
  };
}

export async function verifyPassportEvmAuth(input: {
  challengeId: string;
  walletAddress: string;
  chainId: number;
  signature: string;
  sessionContext: string;
  requestOrigin: string;
  expectedIntendedAction: HolderAuthIntendedAction;
}): Promise<
  | { ok: true; holderSubjectId: string; caip10: string; created: boolean }
  | { ok: false; code: string }
> {
  const authorizedChain = resolveAuthorizedEvmChainIdFromEnv();
  if (authorizedChain === null) return { ok: false, code: "network_config_invalid" };
  if (input.chainId !== authorizedChain) return { ok: false, code: "wrong_network" };

  let wallet: string;
  try {
    wallet = getAddress(input.walletAddress.trim());
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  let row;
  try {
    row = await consumeEvmChallenge({
      challengeId: input.challengeId,
      walletAddress: wallet,
      sessionContextHash: hashSessionContext(input.sessionContext),
    });
  } catch (error) {
    if (error instanceof PassportEvmAuthStoreUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }

  if (!row) return { ok: false, code: "replay" };
  if (new Date(row.expires_at) < new Date()) return { ok: false, code: "expired" };
  if (row.intended_action !== input.expectedIntendedAction) return { ok: false, code: "wrong_action" };
  if (!originsMatch(row.origin, input.requestOrigin)) return { ok: false, code: "wrong_domain" };
  if (row.chain_id !== input.chainId) return { ok: false, code: "wrong_network" };

  const domain = siweDomainFromOrigin(row.origin);
  const valid = await verifyEvmBindingSignature({
    message: row.message,
    signature: input.signature.startsWith("0x") ? input.signature as `0x${string}` : `0x${input.signature}` as `0x${string}`,
    expectedAddress: wallet,
    expectedDomain: domain,
    expectedChainId: row.chain_id,
    expectedNonce: row.nonce,
  });
  if (!valid) return { ok: false, code: "invalid_signature" };

  const caip = caip10Evm(row.chain_id, wallet);
  const subject = await resolveSubjectForVerifiedWallet({ caip, authMethod: "evm_wallet" });
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

export { assertPassportWalletSameOriginRequest, resolvePassportWalletRequestOrigin };
