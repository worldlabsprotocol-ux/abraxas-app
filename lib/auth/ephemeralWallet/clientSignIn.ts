// FILE: lib/auth/ephemeralWallet/clientSignIn.ts

import { notifyEphemeralWalletSessionChanged } from "./clientSession";
import type { WalletSignInChallengeDisplay } from "./signInDisplayContext";
import {
  signWalletMessageWithControls,
  type WalletMessageSignFailureCode,
} from "./walletMessageSignAttempt";

export type EphemeralWalletSignInResult =
  | { ok: true; walletAddress: string }
  | {
      ok: false;
      reason: "cancelled" | "failed";
      code?: string;
      message?: string;
      signFailureCode?: WalletMessageSignFailureCode;
      signFailureDetail?: string;
    };

export type EphemeralWalletSignInChallenge = {
  challenge_id: string;
  message: string;
  expires_at: string;
  display: WalletSignInChallengeDisplay;
};

function describeError(code: string | undefined): string {
  switch (code) {
    case "wrong_network":
      return "This wallet is on the wrong Solana network for Abraxas.";
    case "wrong_origin":
    case "wrong_domain":
      return "Sign-in must be completed from the official Abraxas site.";
    case "expired":
      return "The sign-in request expired. Try again.";
    case "replay":
      return "This sign-in request was already used.";
    case "invalid_signature":
    case "wrong_signer":
      return "Wallet signature could not be verified.";
    case "store_unavailable":
    case "session_unavailable":
      return "Wallet sign-in is temporarily unavailable.";
    case "rate_limited":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return "Could not sign in. Try again.";
  }
}

export async function fetchEphemeralWalletSignInChallenge(input: {
  walletAddress: string;
  solanaNetwork?: string;
  signal?: AbortSignal;
}): Promise<
  | { ok: true; challenge: EphemeralWalletSignInChallenge }
  | { ok: false; code?: string; message?: string }
> {
  const solanaNetwork = input.solanaNetwork ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";

  const challengeRes = await fetch("/api/auth/wallet/solana/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet_address: input.walletAddress,
      solana_network: solanaNetwork,
    }),
    signal: input.signal,
  });
  const challengeBody = (await challengeRes.json()) as {
    ok?: boolean;
    challenge?: {
      challenge_id: string;
      message: string;
      expires_at: string;
      display?: WalletSignInChallengeDisplay;
    };
    code?: string;
  };
  if (!challengeRes.ok || !challengeBody.challenge) {
    return {
      ok: false,
      code: challengeBody.code,
      message: describeError(challengeBody.code),
    };
  }
  if (!challengeBody.challenge.display) {
    return { ok: false, code: "invalid_challenge", message: describeError(undefined) };
  }
  if (new Date(challengeBody.challenge.expires_at) <= new Date()) {
    return { ok: false, code: "expired", message: describeError("expired") };
  }

  return {
    ok: true,
    challenge: {
      challenge_id: challengeBody.challenge.challenge_id,
      message: challengeBody.challenge.message,
      expires_at: challengeBody.challenge.expires_at,
      display: challengeBody.challenge.display,
    },
  };
}

export async function completeEphemeralWalletSignInWithChallenge(input: {
  challenge: EphemeralWalletSignInChallenge;
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  solanaNetwork?: string;
  signal?: AbortSignal;
  isStale?: () => boolean;
}): Promise<EphemeralWalletSignInResult> {
  const solanaNetwork = input.solanaNetwork ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";

  const signed = await signWalletMessageWithControls({
    message: input.challenge.message,
    signMessage: input.signMessage,
    signal: input.signal,
    isStale: input.isStale,
  });
  if (!signed.ok) {
    if (signed.code === "timeout") {
      return {
        ok: false,
        reason: "failed",
        code: "expired",
        message: describeError("expired"),
        signFailureCode: signed.code,
      };
    }
    if (signed.code === "wallet_error") {
      return {
        ok: false,
        reason: "failed",
        code: "wallet_sign_error",
        signFailureCode: signed.code,
        signFailureDetail: signed.detail,
      };
    }
    if (signed.code === "cancelled" || signed.code === "aborted" || signed.code === "stale") {
      return { ok: false, reason: "cancelled", signFailureCode: signed.code };
    }
    return {
      ok: false,
      reason: "failed",
      code: "wallet_sign_error",
      signFailureCode: signed.code,
      signFailureDetail: signed.detail,
    };
  }
  if (input.isStale?.()) {
    return { ok: false, reason: "cancelled", signFailureCode: "stale" };
  }

  const signature = Buffer.from(signed.signatureBytes).toString("base64");
  if (input.isStale?.()) {
    return { ok: false, reason: "cancelled" };
  }

  const verifyRes = await fetch("/api/auth/wallet/solana/verify", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: input.challenge.challenge_id,
      wallet_address: input.walletAddress,
      solana_network: solanaNetwork,
      signature,
    }),
  });
  const verifyBody = (await verifyRes.json()) as { ok?: boolean; wallet_address?: string; code?: string };
  if (!verifyRes.ok || !verifyBody.ok || !verifyBody.wallet_address) {
    return {
      ok: false,
      reason: "failed",
      code: verifyBody.code,
      message: describeError(verifyBody.code),
    };
  }

  notifyEphemeralWalletSessionChanged();
  return { ok: true, walletAddress: verifyBody.wallet_address };
}

export async function completeEphemeralWalletSignIn(input: {
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  solanaNetwork?: string;
  signal?: AbortSignal;
  isStale?: () => boolean;
}): Promise<EphemeralWalletSignInResult> {
  const fetched = await fetchEphemeralWalletSignInChallenge({
    walletAddress: input.walletAddress,
    solanaNetwork: input.solanaNetwork,
    signal: input.signal,
  });
  if (!fetched.ok) {
    return { ok: false, reason: "failed", code: fetched.code, message: fetched.message };
  }
  return completeEphemeralWalletSignInWithChallenge({
    challenge: fetched.challenge,
    walletAddress: input.walletAddress,
    signMessage: input.signMessage,
    solanaNetwork: input.solanaNetwork,
    signal: input.signal,
    isStale: input.isStale,
  });
}
