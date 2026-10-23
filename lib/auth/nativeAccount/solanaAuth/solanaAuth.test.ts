// FILE: lib/auth/nativeAccount/solanaAuth/solanaAuth.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { resetNativeAccountMemory } from "../memoryStore";
import { buildAccountSolanaSignInMessage } from "./message";
import { encodePassportSolanaMessage } from "@/lib/auth/passportSolanaAuth/message";
import {
  issueAccountSolanaAuthChallenge,
  verifyAccountSolanaAuth,
} from "./service";

describe("native account Solana auth", () => {
  beforeEach(() => {
    resetNativeAccountMemory();
    process.env.ABRAXAS_NATIVE_ACCOUNT_MEMORY = "1";
    process.env.NEXT_PUBLIC_SOLANA_NETWORK = "devnet";
  });

  it("creates account on first verified signature and reuses on second", async () => {
    const kp = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const origin = "http://localhost:3000";
    const sessionContext = "ctx-test-1";

    const issued = await issueAccountSolanaAuthChallenge({
      origin,
      uri: `${origin}/account/applications`,
      walletAddress: wallet,
      solanaNetwork: "devnet",
      sessionContext,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const message = issued.challenge.message;
    const sig = nacl.sign.detached(
      encodePassportSolanaMessage(message),
      kp.secretKey,
    );
    const signature = Buffer.from(sig).toString("base64");

    const verified = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet,
      solanaNetwork: "devnet",
      signature,
      sessionContext,
      requestOrigin: origin,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.created).toBe(true);
    const firstId = verified.accountId;

    const sessionContext2 = "ctx-test-2";
    const issued2 = await issueAccountSolanaAuthChallenge({
      origin,
      uri: `${origin}/account/applications`,
      walletAddress: wallet,
      solanaNetwork: "devnet",
      sessionContext: sessionContext2,
    });
    expect(issued2.ok).toBe(true);
    if (!issued2.ok) return;
    const sig2 = nacl.sign.detached(
      encodePassportSolanaMessage(issued2.challenge.message),
      kp.secretKey,
    );
    const verified2 = await verifyAccountSolanaAuth({
      challengeId: issued2.challenge.challenge_id,
      walletAddress: wallet,
      solanaNetwork: "devnet",
      signature: Buffer.from(sig2).toString("base64"),
      sessionContext: sessionContext2,
      requestOrigin: origin,
    });
    expect(verified2.ok).toBe(true);
    if (!verified2.ok) return;
    expect(verified2.created).toBe(false);
    expect(verified2.accountId).toBe(firstId);
  });

  it("builds Abraxas wallet authorization message with domain binding and nonce", () => {
    const msg = buildAccountSolanaSignInMessage({
      domain: "localhost:3010",
      walletAddress: "11111111111111111111111111111111",
      uri: "http://localhost:3010/account/applications",
      solanaNetwork: "devnet",
      nonce: "abc",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:05:00.000Z",
      requestId: "req1",
      origin: "http://localhost:3010",
    });
    expect(msg).toContain("ABRAXAS — WALLET SIGN-IN");
    expect(msg).toContain("Nonce: abc");
    expect(msg).not.toContain("wants you to sign in with your Solana account");
  });
});
