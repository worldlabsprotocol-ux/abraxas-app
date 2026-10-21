// FILE: lib/wallet/passportSolanaAuthClient.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { runPassportSolanaWalletAuth } from "./passportSolanaAuthClient";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { createWalletVerifyAttempt } from "./walletVerifyAttempt";

describe("runPassportSolanaWalletAuth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns stale when attempt is invalidated before verify completes", async () => {
    const attempt = createWalletVerifyAttempt();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          challenge: { challenge_id: "c1", message: "sign-me" },
        }),
      } as Response)
      .mockImplementation(async () => {
        attempt.invalidate();
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      });

    const signMessage = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const result = await runPassportSolanaWalletAuth({
      walletAddress: "abc",
      signMessage,
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      attempt,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale");
  });
});
