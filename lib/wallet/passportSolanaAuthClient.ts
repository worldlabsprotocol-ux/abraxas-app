"use client";
// FILE: lib/wallet/passportSolanaAuthClient.ts
// Challenge → sign → verify with interruption controls (no secret logging).

import { signWalletMessageWithControls } from "@/lib/auth/ephemeralWallet/walletMessageSignAttempt";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import type { WalletVerifyAttempt } from "./walletVerifyAttempt";

export type PassportSolanaAuthResult =
  | { ok: true }
  | { ok: false; code: string; phase: "challenge" | "sign" | "verify" };

export async function runPassportSolanaWalletAuth(input: {
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  intendedAction: typeof HOLDER_AUTH_ACTIONS.partnerVerify | typeof HOLDER_AUTH_ACTIONS.passportSignIn;
  solanaNetwork?: string;
  attempt?: WalletVerifyAttempt;
  onPhase?: (phase: "sign" | "verify") => void;
}): Promise<PassportSolanaAuthResult> {
  const solanaNetwork = input.solanaNetwork ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
  const isStale = () => input.attempt?.isStale() ?? false;

  if (isStale()) return { ok: false, code: "stale", phase: "challenge" };

  const challengeRes = await fetch("/api/auth/passport-solana/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet_address: input.walletAddress,
      solana_network: solanaNetwork,
      intended_action: input.intendedAction,
    }),
    signal: input.attempt?.abort.signal,
  });
  const challengeBody = await challengeRes.json() as {
    ok?: boolean;
    challenge?: { challenge_id: string; message: string };
    code?: string;
  };
  if (isStale()) return { ok: false, code: "stale", phase: "challenge" };
  if (!challengeRes.ok || !challengeBody.challenge) {
    return { ok: false, code: challengeBody.code ?? "challenge_failed", phase: "challenge" };
  }

  input.onPhase?.("sign");
  const signed = await signWalletMessageWithControls({
    message: challengeBody.challenge.message,
    signMessage: input.signMessage,
    signal: input.attempt?.abort.signal,
    isStale,
  });
  if (isStale()) return { ok: false, code: "stale", phase: "sign" };
  if (!signed.ok) {
    return { ok: false, code: signed.code, phase: "sign" };
  }
  const signature = Buffer.from(signed.signatureBytes).toString("base64");

  input.onPhase?.("verify");
  const verifyRes = await fetch("/api/auth/passport-solana/verify", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: challengeBody.challenge.challenge_id,
      wallet_address: input.walletAddress,
      solana_network: solanaNetwork,
      signature,
      intended_action: input.intendedAction,
    }),
    signal: input.attempt?.abort.signal,
  });
  const verifyBody = await verifyRes.json() as { ok?: boolean; code?: string };
  if (isStale()) return { ok: false, code: "stale", phase: "verify" };
  if (!verifyRes.ok || !verifyBody.ok) {
    return { ok: false, code: verifyBody.code ?? "verify_failed", phase: "verify" };
  }

  window.dispatchEvent(new Event("abraxas:holder-session"));
  return { ok: true };
}
