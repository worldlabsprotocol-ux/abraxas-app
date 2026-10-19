// FILE: lib/auth/ephemeralWallet/clientActionAuth.ts

import type { WalletActionOperation } from "./actionDisplayContext";
import type { WalletActionChallengeDisplay } from "./actionDisplayContext";
import { bytesToBase64 } from "./bytesToBase64";
import { WALLET_SOL_AUTH_CHALLENGE_TTL_MS } from "./contract";

export type WalletActionChallengePayload = {
  challenge_id: string;
  message: string;
  expires_at: string;
  operation: WalletActionOperation;
  display?: WalletActionChallengeDisplay;
};

export type WalletActionSignFailureCode =
  | "cancelled"
  | "timeout"
  | "aborted"
  | "stale"
  | "challenge_fetch_failed"
  | "expired";

export async function fetchWalletActionChallenge(input: {
  operation: WalletActionOperation;
  resource: string;
  policyId?: string;
  solanaNetwork?: string;
  signal?: AbortSignal;
}): Promise<
  | { ok: true; challenge: WalletActionChallengePayload }
  | { ok: false; code?: string }
> {
  const challengeRes = await fetch("/api/auth/wallet/solana/action/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operation: input.operation,
      resource: input.resource,
      policy_id: input.policyId,
      solana_network: input.solanaNetwork,
    }),
    signal: input.signal,
  });
  const challengeBody = (await challengeRes.json()) as {
    ok?: boolean;
    challenge?: WalletActionChallengePayload;
    code?: string;
  };
  if (!challengeRes.ok || !challengeBody.challenge) {
    return { ok: false, code: challengeBody.code ?? "challenge_fetch_failed" };
  }
  if (new Date(challengeBody.challenge.expires_at) <= new Date()) {
    return { ok: false, code: "expired" };
  }
  return { ok: true, challenge: challengeBody.challenge };
}

function waitForAbort(signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (!signal) return;
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
      once: true,
    });
  });
}

export async function signWalletActionChallenge(input: {
  challenge: WalletActionChallengePayload;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signal?: AbortSignal;
  isStale?: () => boolean;
  timeoutMs?: number;
}): Promise<
  | { ok: true; action_challenge_id: string; signature: string }
  | { ok: false; code: WalletActionSignFailureCode }
> {
  if (input.isStale?.()) return { ok: false, code: "stale" };
  if (new Date(input.challenge.expires_at) <= new Date()) {
    return { ok: false, code: "expired" };
  }

  const timeoutMs = input.timeoutMs ?? WALLET_SOL_AUTH_CHALLENGE_TTL_MS;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const signatureBytes = await Promise.race([
      input.signMessage(new TextEncoder().encode(input.challenge.message)),
      waitForAbort(input.signal),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("wallet_sign_timeout")), timeoutMs);
      }),
    ]);
    if (input.isStale?.()) return { ok: false, code: "stale" };
    return {
      ok: true,
      action_challenge_id: input.challenge.challenge_id,
      signature: bytesToBase64(signatureBytes),
    };
  } catch (error) {
    if (input.isStale?.()) return { ok: false, code: "stale" };
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, code: "aborted" };
    }
    if (error instanceof Error && error.message === "wallet_sign_timeout") {
      return { ok: false, code: "timeout" };
    }
    return { ok: false, code: "cancelled" };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Legacy single-step helper (prefer fetch + review + sign in UI). */
export async function completeWalletActionAuthorization(input: {
  operation: WalletActionOperation;
  resource: string;
  policyId?: string;
  solanaNetwork?: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<
  | { ok: true; action_challenge_id: string; signature: string }
  | { ok: false; code?: string }
> {
  const challengeResult = await fetchWalletActionChallenge({
    operation: input.operation,
    resource: input.resource,
    policyId: input.policyId,
    solanaNetwork: input.solanaNetwork,
  });
  if (!challengeResult.ok) {
    return { ok: false, code: challengeResult.code };
  }

  const signed = await signWalletActionChallenge({
    challenge: challengeResult.challenge,
    signMessage: input.signMessage,
  });
  if (!signed.ok) {
    return { ok: false, code: signed.code };
  }
  return signed;
}
