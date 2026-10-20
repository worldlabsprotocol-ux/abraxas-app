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
