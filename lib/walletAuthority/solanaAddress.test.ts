import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { normalizeSolanaAddress } from "./solanaAddress";

describe("normalizeSolanaAddress", () => {
  it("canonicalizes base58 wallet addresses", () => {
    const key = new PublicKey("11111111111111111111111111111111");
    expect(normalizeSolanaAddress(key.toBase58())).toBe(key.toBase58());
  });
});
