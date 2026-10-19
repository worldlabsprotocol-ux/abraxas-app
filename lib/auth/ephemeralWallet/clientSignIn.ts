// FILE: lib/auth/ephemeralWallet/clientSignIn.ts

import { notifyEphemeralWalletSessionChanged } from "./clientSession";

export type EphemeralWalletSignInResult =
  | { ok: true; walletAddress: string }
  | { ok: false; reason: "cancelled" | "failed"; code?: string; message?: string };

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

export async function completeEphemeralWalletSignIn(input: {
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  solanaNetwork?: string;
}): Promise<EphemeralWalletSignInResult> {
  const solanaNetwork = input.solanaNetwork ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";

  const challengeRes = await fetch("/api/auth/wallet/solana/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet_address: input.walletAddress,
      solana_network: solanaNetwork,
    }),
  });
  const challengeBody = (await challengeRes.json()) as {
    ok?: boolean;
    challenge?: { challenge_id: string; message: string };
    code?: string;
  };
  if (!challengeRes.ok || !challengeBody.challenge) {
    return {
      ok: false,
      reason: "failed",
      code: challengeBody.code,
      message: describeError(challengeBody.code),
    };
  }

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = await input.signMessage(new TextEncoder().encode(challengeBody.challenge.message));
  } catch {
    return { ok: false, reason: "cancelled" };
  }

  const signature = Buffer.from(signatureBytes).toString("base64");
  const verifyRes = await fetch("/api/auth/wallet/solana/verify", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: challengeBody.challenge.challenge_id,
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
