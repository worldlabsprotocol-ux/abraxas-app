// FILE: lib/auth/ephemeralWallet/walletMessageSignAttempt.test.ts

import { describe, expect, it, vi } from "vitest";
import { signWalletMessageWithControls } from "./walletMessageSignAttempt";

describe("signWalletMessageWithControls", () => {
  it("returns aborted when signal is aborted during a hanging wallet request", async () => {
    const controller = new AbortController();
    const signMessage = vi.fn(
      () =>
        new Promise<Uint8Array>(() => {
          /* phantom pending */
        }),
    );
    const promise = signWalletMessageWithControls({
      message: "hello",
      signMessage,
      signal: controller.signal,
      timeoutMs: 60_000,
    });
    controller.abort();
    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("aborted");
  });

  it("accepts a delayed wallet signature (popup focus) without treating it as abort", async () => {
    const signMessage = vi.fn(
      () =>
        new Promise<Uint8Array>((resolve) => {
          setTimeout(() => resolve(new Uint8Array([4, 5])), 35);
        }),
    );

    const result = await signWalletMessageWithControls({
      message: "delayed-phantom-approval",
      signMessage,
      timeoutMs: 5_000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.signatureBytes).toEqual(new Uint8Array([4, 5]));
  });

  it("returns wallet_error for unknown adapter failures (not cancellation)", async () => {
    const result = await signWalletMessageWithControls({
      message: "hello",
      signMessage: async () => {
        throw new Error("Unexpected internal wallet failure");
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("wallet_error");
      expect(result.detail).toContain("Unexpected");
    }
  });

  it("returns cancelled for explicit user rejection", async () => {
    const result = await signWalletMessageWithControls({
      message: "hello",
      signMessage: async () => {
        throw new Error("User rejected");
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("cancelled");
  });

  it("returns stale when generation advances before wallet responds", async () => {
    let stale = false;
    const result = await signWalletMessageWithControls({
      message: "hello",
      signMessage: async () => {
        stale = true;
        return new Uint8Array([1]);
      },
      isStale: () => stale,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale");
  });
});
