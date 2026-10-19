// FILE: lib/auth/ephemeralWallet/clientActionAuth.test.ts
/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWalletActionChallenge, signWalletActionChallenge } from "./clientActionAuth";

describe("clientActionAuth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ignores stale wallet signatures when generation advances", async () => {
    let stale = false;
    const signMessage = vi.fn(async () => {
      stale = true;
      return new Uint8Array([1, 2, 3]);
    });

    const result = await signWalletActionChallenge({
      challenge: {
        challenge_id: "ewac_1",
        message: "test message",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        operation: "sandbox:verification:test",
      },
      signMessage,
      isStale: () => stale,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale");
  });

  it("returns expired when challenge TTL elapsed before signing", async () => {
    const result = await signWalletActionChallenge({
      challenge: {
        challenge_id: "ewac_2",
        message: "test",
        expires_at: new Date(Date.now() - 1_000).toISOString(),
        operation: "sandbox:verification:test",
      },
      signMessage: async () => new Uint8Array([1]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("expired");
  });

  it("fetchWalletActionChallenge rejects expired server challenges", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          challenge: {
            challenge_id: "ewac_3",
            message: "msg",
            expires_at: new Date(Date.now() - 5_000).toISOString(),
            operation: "sandbox:verification:test",
          },
        }),
      ),
    );
    const result = await fetchWalletActionChallenge({
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws:policy:wallet_control",
      policyId: "wallet_control",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("expired");
  });
});
