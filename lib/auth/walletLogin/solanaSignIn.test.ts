// FILE: lib/auth/walletLogin/solanaSignIn.test.ts

import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
  buildSolanaSignInMessage,
  createLoginNonce,
  parseSolanaSignInMessage,
  verifySolanaSignInSignature,
} from "@/lib/auth/walletLogin/solanaSignIn";

describe("solanaSignIn", () => {
  it("round-trips message parse", () => {
    const kp = Keypair.generate();
    const nonce = createLoginNonce();
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(Date.now() + 600_000).toISOString();
    const message = buildSolanaSignInMessage({
      domain: "demo.abraxasworld.xyz",
      address: kp.publicKey.toBase58(),
      chainId: "mainnet",
      nonce,
      issuedAt,
      expirationTime,
    });
    const parsed = parseSolanaSignInMessage(message);
    expect(parsed?.nonce).toBe(nonce);
    expect(parsed?.address).toBe(kp.publicKey.toBase58());
  });

  it("accepts valid ed25519 signature", () => {
    const kp = Keypair.generate();
    const nonce = createLoginNonce();
    const now = Date.now();
    const issuedAt = new Date(now).toISOString();
    const expirationTime = new Date(now + 600_000).toISOString();
    const message = buildSolanaSignInMessage({
      domain: "demo.abraxasworld.xyz",
      address: kp.publicKey.toBase58(),
      chainId: "mainnet",
      nonce,
      issuedAt,
      expirationTime,
    });
    const signature = nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey);
    const signatureBase64 = Buffer.from(signature).toString("base64");

    const result = verifySolanaSignInSignature({
      message,
      signatureBase64,
      expectedAddress: kp.publicKey.toBase58(),
      expectedDomain: "demo.abraxasworld.xyz",
      expectedNonce: nonce,
      expectedChainId: "mainnet",
      nowMs: now + 1000,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects replayed nonce mismatch", () => {
    const kp = Keypair.generate();
    const nonce = createLoginNonce();
    const now = Date.now();
    const message = buildSolanaSignInMessage({
      domain: "demo.abraxasworld.xyz",
      address: kp.publicKey.toBase58(),
      chainId: "mainnet",
      nonce,
      issuedAt: new Date(now).toISOString(),
      expirationTime: new Date(now + 600_000).toISOString(),
    });
    const signature = nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey);
    const result = verifySolanaSignInSignature({
      message,
      signatureBase64: Buffer.from(signature).toString("base64"),
      expectedAddress: kp.publicKey.toBase58(),
      expectedDomain: "demo.abraxasworld.xyz",
      expectedNonce: "other-nonce",
      expectedChainId: "mainnet",
      nowMs: now + 1000,
    });
    expect(result.ok).toBe(false);
  });
});
