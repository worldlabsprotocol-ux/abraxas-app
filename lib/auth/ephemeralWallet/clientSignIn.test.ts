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
            challenge: {
              challenge_id: "ch_1",
              message: "sign in",
              expires_at: new Date(Date.now() + 300_000).toISOString(),
              display: {
                kind: "wallet_sign_in",
                action_title: "Abraxas wallet sign-in",
                summary: "Verify control of your wallet to sign in to Abraxas.",
                funds_lines: ["No funds will move."],
                requested_by: "localhost",
                wallet_address: "11111111111111111111111111111111",
                expires_at: new Date(Date.now() + 300_000).toISOString(),
                challenge_id: "ch_1",
              },
            },
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

  it("does not verify when attempt is stale after signing", async () => {
    let verifyCalled = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/challenge")) {
          return Response.json({
            ok: true,
            challenge: {
              challenge_id: "ch_stale",
              message: "sign in",
              expires_at: new Date(Date.now() + 300_000).toISOString(),
              display: {
                kind: "wallet_sign_in",
                action_title: "Abraxas wallet sign-in",
                summary: "Verify control of your wallet to sign in to Abraxas.",
                funds_lines: ["No funds will move."],
                requested_by: "localhost",
                wallet_address: "11111111111111111111111111111111",
                expires_at: new Date(Date.now() + 300_000).toISOString(),
                challenge_id: "ch_stale",
              },
            },
          });
        }
        if (url.includes("/verify")) {
          verifyCalled = true;
          return Response.json({ ok: true, wallet_address: "11111111111111111111111111111111" });
        }
        return Response.json({ ok: false }, { status: 400 });
      }),
    );

    let stale = false;
    const result = await completeEphemeralWalletSignIn({
      walletAddress: "11111111111111111111111111111111",
      signMessage: async () => {
        stale = true;
        return new Uint8Array([9]);
      },
      isStale: () => stale,
    });

    expect(result.ok).toBe(false);
    expect(verifyCalled).toBe(false);
  });
});
