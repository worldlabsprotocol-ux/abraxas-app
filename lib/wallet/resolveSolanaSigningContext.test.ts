// FILE: lib/wallet/resolveSolanaSigningContext.test.ts

import { describe, expect, it, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { resolveSolanaSigningContext } from "./resolveSolanaSigningContext";

describe("resolveSolanaSigningContext", () => {
  it("falls back to adapter publicKey and signMessage when React state lags", async () => {
    const pk = new PublicKey("11111111111111111111111111111112");
    const signMessage = vi.fn(async () => new Uint8Array([2]));
    const wallets = [{
      adapter: {
        name: "Phantom",
        publicKey: pk,
        signMessage,
      },
    }] as never;

    const resolved = resolveSolanaSigningContext({
      publicKey: null,
      signMessage: undefined,
      wallet: null,
      wallets,
    });

    expect(resolved.publicKey?.toBase58()).toBe(pk.toBase58());
    await resolved.signMessage?.(new Uint8Array([1]));
    expect(signMessage).toHaveBeenCalled();
  });
});
