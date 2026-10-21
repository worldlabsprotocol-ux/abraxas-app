// FILE: lib/wallet/waitForWalletSigningContext.test.ts

import { describe, expect, it, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { waitForWalletSigningContext } from "./waitForWalletSigningContext";

describe("waitForWalletSigningContext", () => {
  it("waits until publicKey and signMessage become available", async () => {
    const pk = new PublicKey("11111111111111111111111111111112");
    const signMessage = vi.fn(async () => new Uint8Array([1]));
    let exposedPk: PublicKey | null = null;
    let exposedSign: typeof signMessage | undefined;

    const promise = waitForWalletSigningContext({
      getPublicKey: () => exposedPk,
      getSignMessage: () => exposedSign,
      maxWaitMs: 2_000,
    });

    setTimeout(() => {
      exposedPk = pk;
      exposedSign = signMessage;
    }, 30);

    const result = await promise;
    expect(result?.publicKey.toBase58()).toBe(pk.toBase58());
    expect(result?.signMessage).toBe(signMessage);
  });

  it("returns null when signing context never appears", async () => {
    const result = await waitForWalletSigningContext({
      getPublicKey: () => null,
      getSignMessage: () => undefined,
      maxWaitMs: 40,
    });
    expect(result).toBeNull();
  });
});
