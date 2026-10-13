// FILE: lib/auth/passportWalletAuth/client/signInWithPassportWallet.ts
"use client";

import type { Wallet } from "@wallet-standard/base";
import { normalizeSuiAddress } from "@mysten/sui/utils";

const SUI_SIGN_PERSONAL_MESSAGE = "sui:signPersonalMessage";
import { PASSPORT_WALLET_ACTIONS } from "@/lib/auth/passportWalletAuth/contract";
import type { HolderWalletConnection } from "@/components/sui/SuiWalletStandardConnect";

export type PassportWalletSignInResult =
  | { ok: true; suiAddress: string; createdIdentity: boolean }
  | { ok: false; code: string; detail?: string };

type PassportWalletClientAction =
  | typeof PASSPORT_WALLET_ACTIONS.passportSignIn
  | typeof PASSPORT_WALLET_ACTIONS.partnerVerify
  | typeof PASSPORT_WALLET_ACTIONS.linkLegacyWallet;

async function signPassportWalletChallenge(input: {
  wallet: Wallet;
  connection: HolderWalletConnection;
  intendedAction: PassportWalletClientAction;
  verifyPath: "/api/auth/passport-wallet/verify" | "/api/auth/passport-wallet/link-legacy";
}): Promise<PassportWalletSignInResult> {
  const walletAddress = normalizeSuiAddress(input.connection.address);
  const suiNetwork = input.connection.chain;

  const challengeRes = await fetch("/api/auth/passport-wallet/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet_address: walletAddress,
      sui_network: suiNetwork,
      intended_action: input.intendedAction,
    }),
  });
  const challengeBody = await challengeRes.json().catch(() => ({})) as {
    ok?: boolean;
    challenge?: { challenge_id: string; message: string };
    code?: string;
  };
  if (!challengeRes.ok || !challengeBody.ok || !challengeBody.challenge) {
    return { ok: false, code: challengeBody.code ?? "challenge_failed" };
  }

  const signFeature = input.wallet.features[SUI_SIGN_PERSONAL_MESSAGE as keyof typeof input.wallet.features] as
    | { signPersonalMessage?: (input: { message: Uint8Array }) => Promise<{ signature: string }> }
    | undefined;
  const signPersonalMessage = signFeature?.signPersonalMessage;
  if (!signPersonalMessage) {
    return { ok: false, code: "wallet_unsupported", detail: "Wallet does not support signPersonalMessage" };
  }

  const messageBytes = new TextEncoder().encode(challengeBody.challenge.message);
  let signature: string;
  try {
    const signed = await signPersonalMessage({ message: messageBytes });
    signature = signed.signature;
  } catch {
    return { ok: false, code: "signature_rejected" };
  }

  const verifyRes = await fetch(input.verifyPath, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: challengeBody.challenge.challenge_id,
      wallet_address: walletAddress,
      sui_network: suiNetwork,
      signature,
      intended_action: input.intendedAction,
    }),
  });
  const verifyBody = await verifyRes.json().catch(() => ({})) as {
    ok?: boolean;
    sui_address?: string;
    created_identity?: boolean;
    code?: string;
  };
  if (!verifyRes.ok || !verifyBody.ok || !verifyBody.sui_address) {
    return { ok: false, code: verifyBody.code ?? "verify_failed" };
  }

  return {
    ok: true,
    suiAddress: verifyBody.sui_address,
    createdIdentity: Boolean(verifyBody.created_identity),
  };
}

export async function signInWithPassportWallet(input: {
  wallet: Wallet;
  connection: HolderWalletConnection;
  intendedAction?: typeof PASSPORT_WALLET_ACTIONS.passportSignIn | typeof PASSPORT_WALLET_ACTIONS.partnerVerify;
}): Promise<PassportWalletSignInResult> {
  return signPassportWalletChallenge({
    wallet: input.wallet,
    connection: input.connection,
    intendedAction: input.intendedAction ?? PASSPORT_WALLET_ACTIONS.passportSignIn,
    verifyPath: "/api/auth/passport-wallet/verify",
  });
}

export async function linkLegacyPassportWallet(input: {
  wallet: Wallet;
  connection: HolderWalletConnection;
}): Promise<PassportWalletSignInResult> {
  return signPassportWalletChallenge({
    wallet: input.wallet,
    connection: input.connection,
    intendedAction: PASSPORT_WALLET_ACTIONS.linkLegacyWallet,
    verifyPath: "/api/auth/passport-wallet/link-legacy",
  });
}
