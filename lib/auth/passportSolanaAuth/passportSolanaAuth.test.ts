// FILE: lib/auth/passportSolanaAuth/passportSolanaAuth.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { buildPassportSolanaAuthMessage, encodePassportSolanaMessage } from "./message";
import { verifyPassportSolanaPersonalMessage } from "./verifySignature";

describe("passport Solana auth", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SOLANA_NETWORK = "devnet";
  });

  it("verifies ed25519 wallet signatures", () => {
    const kp = Keypair.generate();
    const message = buildPassportSolanaAuthMessage({
      origin: "https://demo.abraxasworld.xyz",
      walletAddress: kp.publicKey.toBase58(),
      solanaNetwork: "devnet",
      intendedAction: "passport_sign_in",
      nonce: "n1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      sessionContext: "ctx",
    });
    const bytes = encodePassportSolanaMessage(message);
    const sig = nacl.sign.detached(bytes, kp.secretKey);
    const ok = verifyPassportSolanaPersonalMessage({
      message,
      signature: bs58.encode(sig),
      walletAddress: kp.publicKey.toBase58(),
    });
    expect(ok).toBe(true);
  });
});
