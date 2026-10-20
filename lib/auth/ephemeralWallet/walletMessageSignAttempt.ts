// FILE: lib/auth/ephemeralWallet/walletMessageSignAttempt.ts

import { WALLET_SOL_AUTH_CHALLENGE_TTL_MS } from "./contract";

export type WalletMessageSignFailureCode = "cancelled" | "aborted" | "timeout" | "stale";

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

function waitForTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("wallet_sign_timeout")), ms);
  });
}

export async function signWalletMessageWithControls(input: {
  message: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signal?: AbortSignal;
  isStale?: () => boolean;
  timeoutMs?: number;
}): Promise<
  | { ok: true; signatureBytes: Uint8Array }
  | { ok: false; code: WalletMessageSignFailureCode }
> {
  if (input.isStale?.()) return { ok: false, code: "stale" };

  const racers: Promise<Uint8Array>[] = [
    input.signMessage(new TextEncoder().encode(input.message)),
  ];
  if (input.signal) racers.push(waitForAbort(input.signal));
  racers.push(waitForTimeout(input.timeoutMs ?? WALLET_SOL_AUTH_CHALLENGE_TTL_MS));

  try {
    const signatureBytes = await Promise.race(racers);
    if (input.isStale?.()) return { ok: false, code: "stale" };
    return { ok: true, signatureBytes };
  } catch (error) {
    if (input.isStale?.()) return { ok: false, code: "stale" };
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, code: "aborted" };
    }
    if (error instanceof Error && error.message === "wallet_sign_timeout") {
      return { ok: false, code: "timeout" };
    }
    return { ok: false, code: "cancelled" };
  }
}
