// FILE: lib/auth/ephemeralWallet/clientSignIn.test.ts
/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { completeEphemeralWalletSignIn } from "./clientSignIn";

describe("completeEphemeralWalletSignIn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns cancelled when sign is aborted before wallet responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/challenge")) {
          return Response.json({
            ok: true,
            challenge: { challenge_id: "ch_1", message: "sign in" },
          });
        }
        return Response.json({ ok: false }, { status: 400 });
      }),
    );

    const controller = new AbortController();
    const signMessage = vi.fn(
      () =>
        new Promise<Uint8Array>(() => {
          /* hang */
        }),
    );
    const promise = completeEphemeralWalletSignIn({
      walletAddress: "11111111111111111111111111111111",
      signMessage,
      signal: controller.signal,
    });
    controller.abort();
    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("cancelled");
    expect(signMessage).toHaveBeenCalledTimes(1);
  });
});
