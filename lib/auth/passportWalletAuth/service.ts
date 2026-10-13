// FILE: lib/auth/passportWalletAuth/service.ts

import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { NextResponse } from "next/server";
import {
  PASSPORT_WALLET_AUTH_COOKIE,
  PASSPORT_WALLET_CHALLENGE_TTL_MS,
  type PassportWalletAuthSuccess,
  type PassportWalletChallengeView,
  type PassportWalletIntendedAction,
} from "./contract";
import { buildPassportWalletAuthMessage } from "./message";
import { isAllowedPassportWalletOrigin } from "./origin";
import {
  canonicalizeSupportedSuiNetwork,
  networkMatchesDeploymentPolicy,
  resolveDeploymentSuiNetworkPolicy,
} from "./network";
import {
  createPassportWalletChallengeId,
  createPassportWalletNonce,
  hashSessionContext,
  insertPassportWalletChallenge,
  PassportWalletAuthStoreUnavailableError,
} from "./store";
import { resolvePassportWalletIdentity } from "./identity";
import { consumeAndValidatePassportWalletChallenge } from "./challengeVerify";

export async function issuePassportWalletAuthChallenge(input: {
  origin: string;
  walletAddress: string;
  suiNetwork: string;
  intendedAction: PassportWalletIntendedAction;
  sessionContext: string;
  now?: Date;
}): Promise<
  | { ok: true; challenge: PassportWalletChallengeView; sessionContext: string }
  | { ok: false; code: "invalid_input" | "wrong_origin" | "wrong_network" | "network_config_invalid" | "store_unavailable" }
> {
  let wallet: string;
  try {
    wallet = normalizeSuiAddress(input.walletAddress.trim());
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  if (!isAllowedPassportWalletOrigin(input.origin)) {
    return { ok: false, code: "wrong_origin" };
  }

  const deploymentNetwork = resolveDeploymentSuiNetworkPolicy();
  if (!deploymentNetwork.ok) {
    return { ok: false, code: deploymentNetwork.code };
  }

  const canonicalNetwork = canonicalizeSupportedSuiNetwork(input.suiNetwork);
  if (!canonicalNetwork || !networkMatchesDeploymentPolicy(canonicalNetwork)) {
    return { ok: false, code: "wrong_network" };
  }

  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + PASSPORT_WALLET_CHALLENGE_TTL_MS).toISOString();
  const nonce = createPassportWalletNonce();
  const challengeId = createPassportWalletChallengeId();
  const sessionContext = input.sessionContext.trim() || createPassportWalletNonce();
  const message = buildPassportWalletAuthMessage({
    origin: new URL(input.origin).origin,
    walletAddress: wallet,
    suiNetwork: canonicalNetwork,
    intendedAction: input.intendedAction,
    nonce,
    expiresAt,
    sessionContext,
  });

  try {
    await insertPassportWalletChallenge({
      id: challengeId,
      wallet_address: wallet,
      sui_network: canonicalNetwork,
      origin: new URL(input.origin).origin,
      intended_action: input.intendedAction,
      session_context_hash: hashSessionContext(sessionContext),
      nonce,
      message,
      expires_at: expiresAt,
    });
  } catch (error) {
    if (error instanceof PassportWalletAuthStoreUnavailableError) {
      return { ok: false, code: "store_unavailable" };
    }
    throw error;
  }

  return {
    ok: true,
    sessionContext,
    challenge: {
      challenge_id: challengeId,
      message,
      expires_at: expiresAt,
      wallet_address: wallet,
      sui_network: canonicalNetwork,
      intended_action: input.intendedAction,
    },
  };
}

export async function verifyPassportWalletAuth(input: {
  challengeId: string;
  walletAddress: string;
  suiNetwork: string;
  signature: string;
  sessionContext: string;
  requestOrigin: string;
  expectedIntendedAction: PassportWalletIntendedAction;
}): Promise<
  | { ok: true; result: PassportWalletAuthSuccess; message: string }
  | { ok: false; code: string }
> {
  let wallet: string;
  try {
    wallet = normalizeSuiAddress(input.walletAddress.trim());
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  const consumed = await consumeAndValidatePassportWalletChallenge({
    ...input,
    expectedIntendedAction: input.expectedIntendedAction,
  });
  if (!consumed.ok) {
    return consumed;
  }
  const row = consumed.row;

  const identity = await resolvePassportWalletIdentity(wallet);
  if (!identity.ok) {
    return { ok: false, code: identity.code };
  }

  return {
    ok: true,
    message: row.message,
    result: {
      ok: true,
      sui_address: identity.suiAddress,
      provider: "passport_wallet",
      session_kind: "wallet",
      created_identity: identity.created,
    },
  };
}

export function attachPassportWalletAuthContextCookie(res: NextResponse, sessionContext: string): void {
  res.cookies.set(PASSPORT_WALLET_AUTH_COOKIE, sessionContext, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(PASSPORT_WALLET_CHALLENGE_TTL_MS / 1000),
  });
}

export function readPassportWalletAuthContextCookie(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${PASSPORT_WALLET_AUTH_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function clearPassportWalletAuthContextCookie(res: NextResponse): void {
  res.cookies.set(PASSPORT_WALLET_AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
