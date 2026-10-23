// FILE: lib/auth/nativeAccount/clientSolanaAccountSignIn.ts

import { buildWalletSignInChallengeDisplay } from "@/lib/auth/ephemeralWallet/signInDisplayContext";
import type { WalletSignInChallengeDisplay } from "@/lib/auth/ephemeralWallet/signInDisplayContext";
import { signWalletMessageWithControls } from "@/lib/auth/ephemeralWallet/walletMessageSignAttempt";

export type NativeSolanaSignInChallenge = {
  challenge_id: string;
  message: string;
  expires_at: string;
  display: WalletSignInChallengeDisplay;
};

export type SolanaAccountSignInResult =
  | { ok: true; accountId: string; created: boolean }
  | { ok: false; reason: "cancelled" | "failed"; code?: string; message?: string };

export function describeSolanaAccountSignInError(code: string | undefined): string {
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
      return "Wallet signature could not be verified.";
    case "store_unavailable":
    case "session_unavailable":
      return "Account sign-in is temporarily unavailable.";
    case "rate_limited":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return "Could not sign in. Try again.";
  }
}

export async function fetchSolanaAccountSignInChallenge(input: {
  walletAddress: string;
  solanaNetwork?: string;
  signal?: AbortSignal;
}): Promise<
  | { ok: true; challenge: NativeSolanaSignInChallenge }
  | { ok: false; code?: string; message?: string }
> {
  const solanaNetwork = input.solanaNetwork ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";

  const challengeRes = await fetch("/api/auth/native/solana/challenge", {
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
    challenge?: { challenge_id: string; message: string; expires_at: string };
    code?: string;
  };
  if (!challengeRes.ok || !challengeBody.challenge) {
    return {
      ok: false,
      code: challengeBody.code,
      message: describeSolanaAccountSignInError(challengeBody.code),
    };
  }
  if (new Date(challengeBody.challenge.expires_at) <= new Date()) {
    return { ok: false, code: "expired", message: describeSolanaAccountSignInError("expired") };
  }

  const domain =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "abraxasworld.xyz";

  return {
    ok: true,
    challenge: {
      challenge_id: challengeBody.challenge.challenge_id,
      message: challengeBody.challenge.message,
      expires_at: challengeBody.challenge.expires_at,
      display: buildWalletSignInChallengeDisplay({
        domain,
        walletAddress: input.walletAddress,
        expiresAt: challengeBody.challenge.expires_at,
        challengeId: challengeBody.challenge.challenge_id,
      }),
    },
  };
}

export async function completeSolanaAccountSignInWithChallenge(input: {
  challenge: NativeSolanaSignInChallenge;
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  solanaNetwork?: string;
  signal?: AbortSignal;
  isStale?: () => boolean;
}): Promise<SolanaAccountSignInResult> {
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
        message: describeSolanaAccountSignInError("expired"),
      };
    }
    return { ok: false, reason: "cancelled" };
  }
  if (input.isStale?.()) {
    return { ok: false, reason: "cancelled" };
  }

  const signature = Buffer.from(signed.signatureBytes).toString("base64");
  const verifyRes = await fetch("/api/auth/native/solana/verify", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: input.challenge.challenge_id,
      wallet_address: input.walletAddress,
      solana_network: solanaNetwork,
      signature,
    }),
    signal: input.signal,
  });
  const verifyBody = (await verifyRes.json()) as {
    ok?: boolean;
    account_id?: string;
    created?: boolean;
    code?: string;
  };
  if (!verifyRes.ok || !verifyBody.ok || !verifyBody.account_id) {
    return {
      ok: false,
      reason: "failed",
      code: verifyBody.code,
      message: describeSolanaAccountSignInError(verifyBody.code),
    };
  }

  window.dispatchEvent(new Event("abraxas:native-account-session"));
  return { ok: true, accountId: verifyBody.account_id, created: Boolean(verifyBody.created) };
}

export async function completeSolanaAccountSignIn(input: {
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  solanaNetwork?: string;
}): Promise<SolanaAccountSignInResult> {
  const fetched = await fetchSolanaAccountSignInChallenge({
    walletAddress: input.walletAddress,
    solanaNetwork: input.solanaNetwork,
  });
  if (!fetched.ok) {
    return { ok: false, reason: "failed", code: fetched.code, message: fetched.message };
  }
  return completeSolanaAccountSignInWithChallenge({
    challenge: fetched.challenge,
    walletAddress: input.walletAddress,
    signMessage: input.signMessage,
    solanaNetwork: input.solanaNetwork,
  });
}
