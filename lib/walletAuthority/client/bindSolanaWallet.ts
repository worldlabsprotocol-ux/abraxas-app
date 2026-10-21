"use client";
// FILE: lib/walletAuthority/client/bindSolanaWallet.ts
// Solana passport wallet auth — establishes session + wallet_control binding on verify.

import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";

export interface BindSolanaWalletOptions {
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  intendedAction?: typeof HOLDER_AUTH_ACTIONS.partnerVerify | typeof HOLDER_AUTH_ACTIONS.passportSignIn;
  solanaNetwork?: string;
}

export async function bindSolanaWalletToPassport(options: BindSolanaWalletOptions): Promise<void> {
  const solanaNetwork = options.solanaNetwork ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
  const intendedAction = options.intendedAction ?? HOLDER_AUTH_ACTIONS.partnerVerify;

  const challengeRes = await fetch("/api/auth/passport-solana/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet_address: options.walletAddress,
      solana_network: solanaNetwork,
      intended_action: intendedAction,
    }),
  });
  const challengeBody = await challengeRes.json() as {
    ok?: boolean;
    challenge?: { challenge_id: string; message: string };
    code?: string;
  };
  if (!challengeRes.ok || !challengeBody.challenge) {
    throw new Error(challengeBody.code ?? "challenge_failed");
  }

  const messageBytes = new TextEncoder().encode(challengeBody.challenge.message);
  const signatureBytes = await options.signMessage(messageBytes);
  const signature = Buffer.from(signatureBytes).toString("base64");

  const verifyRes = await fetch("/api/auth/passport-solana/verify", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: challengeBody.challenge.challenge_id,
      wallet_address: options.walletAddress,
      solana_network: solanaNetwork,
      signature,
      intended_action: intendedAction,
    }),
  });
  const verifyBody = await verifyRes.json() as { ok?: boolean; code?: string };
  if (!verifyRes.ok || !verifyBody.ok) {
    throw new Error(verifyBody.code ?? "verify_failed");
  }
  window.dispatchEvent(new Event("abraxas:holder-session"));
}
