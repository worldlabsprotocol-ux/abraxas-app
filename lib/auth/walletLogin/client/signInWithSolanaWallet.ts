// FILE: lib/auth/walletLogin/client/signInWithSolanaWallet.ts

import type { WalletContextState } from "@solana/wallet-adapter-react";
import { signWalletStandardChallenge } from "@/lib/partner/walletStandard/connector";

function bytesToBase64(value: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < value.length; i += 1) {
    binary += String.fromCharCode(value[i] ?? 0);
  }
  return btoa(binary);
}

export type WalletSignInResult =
  | { ok: true; continuePath: string | null; passportSubjectReady: boolean }
  | { ok: false; error: string; code?: string };

export async function signInWithSolanaWallet(input: {
  wallet: Pick<WalletContextState, "publicKey" | "connect" | "connected" | "signMessage">;
  continuePath?: string | null;
}): Promise<WalletSignInResult> {
  const { wallet, continuePath } = input;

  if (!wallet.publicKey) {
    try {
      await wallet.connect?.();
    } catch {
      return { ok: false, error: "Wallet connection was cancelled", code: "wallet_connect_cancelled" };
    }
  }

  const address = wallet.publicKey?.toBase58();
  if (!address) {
    return { ok: false, error: "Connect a Solana wallet to continue", code: "wallet_unavailable" };
  }

  const challengeRes = await fetch("/api/auth/wallet-login/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      solana_address: address,
      ...(continuePath ? { continue_path: continuePath } : {}),
    }),
  });

  const challengeData = await challengeRes.json().catch(() => ({})) as {
    error?: string;
    challenge_id?: string;
    message?: string;
  };

  if (!challengeRes.ok || !challengeData.challenge_id || !challengeData.message) {
    return {
      ok: false,
      error: challengeData.error ?? "Could not start wallet sign-in",
      code: "challenge_failed",
    };
  }

  let signature: string;
  if (wallet.signMessage) {
    const encoded = new TextEncoder().encode(challengeData.message);
    const sig = await wallet.signMessage(encoded);
    signature = bytesToBase64(sig);
  } else {
    const signed = await signWalletStandardChallenge(challengeData.message);
    if (!signed.ok) {
      return { ok: false, error: "This wallet cannot sign messages", code: "sign_unavailable" };
    }
    signature = signed.signature;
  }

  const verifyRes = await fetch("/api/auth/wallet-login/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge_id: challengeData.challenge_id,
      signature,
      solana_address: address,
    }),
  });

  const verifyData = await verifyRes.json().catch(() => ({})) as {
    error?: string;
    code?: string;
    continue_path?: string | null;
    passport_subject_ready?: boolean;
  };

  if (!verifyRes.ok) {
    return {
      ok: false,
      error: verifyData.error ?? "Wallet sign-in failed",
      code: verifyData.code,
    };
  }

  return {
    ok: true,
    continuePath: verifyData.continue_path ?? null,
    passportSubjectReady: Boolean(verifyData.passport_subject_ready),
  };
}
