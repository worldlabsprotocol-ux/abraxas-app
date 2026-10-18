// FILE: lib/auth/nativeAccount/solanaAuth/solanaAuth.adversarial.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { resetNativeAccountMemory, nativeAccountMemory } from "../memoryStore";
import { encodeAccountSolanaSignInMessage } from "./message";
import { issueAccountSolanaAuthChallenge, verifyAccountSolanaAuth } from "./service";

const ORIGIN = "http://localhost:3000";

function signMessage(message: string, secretKey: Uint8Array): string {
  const sig = nacl.sign.detached(encodeAccountSolanaSignInMessage(message), secretKey);
  return Buffer.from(sig).toString("base64");
}

async function issueAndSign(wallet: Keypair, sessionContext: string) {
  const issued = await issueAccountSolanaAuthChallenge({
    origin: ORIGIN,
    uri: `${ORIGIN}/account/applications`,
    walletAddress: wallet.publicKey.toBase58(),
    solanaNetwork: "devnet",
    sessionContext,
  });
  if (!issued.ok) throw new Error(issued.code);
  const signature = signMessage(issued.challenge.message, wallet.secretKey);
  return { issued, signature };
}

describe("Solana account auth adversarial", () => {
  beforeEach(() => {
    resetNativeAccountMemory();
    process.env.ABRAXAS_NATIVE_ACCOUNT_MEMORY = "1";
    process.env.NEXT_PUBLIC_SOLANA_NETWORK = "devnet";
  });

  it("rejects replayed challenge consumption", async () => {
    const wallet = Keypair.generate();
    const ctx = "ctx-replay";
    const { issued, signature } = await issueAndSign(wallet, ctx);

    const first = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
    });
    expect(first.ok).toBe(true);

    const replay = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
    });
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.code).toBe("replay");
  });

  it("rejects wrong signer for challenge wallet", async () => {
    const wallet = Keypair.generate();
    const other = Keypair.generate();
    const ctx = "ctx-wrong-signer";
    const { issued } = await issueAndSign(wallet, ctx);
    const badSig = signMessage(issued.challenge.message, other.secretKey);

    const result = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature: badSig,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_signature");
  });

  it("rejects wrong session context hash", async () => {
    const wallet = Keypair.generate();
    const { issued, signature } = await issueAndSign(wallet, "ctx-a");

    const result = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: "ctx-b",
      requestOrigin: ORIGIN,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("replay");
  });

  it("rejects expired challenges", async () => {
    const wallet = Keypair.generate();
    const ctx = "ctx-expired";
    const { issued, signature } = await issueAndSign(wallet, ctx);
    nativeAccountMemory.setSolanaChallengeExpiresAt(
      issued.challenge.challenge_id,
      new Date(Date.now() - 60_000).toISOString(),
    );

    const expired = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
    });
    expect(expired.ok).toBe(false);
    if (expired.ok) return;
    expect(expired.code).toBe("replay");
  });

  it("rejects wrong request origin domain binding", async () => {
    const wallet = Keypair.generate();
    const ctx = "ctx-domain";
    const { issued, signature } = await issueAndSign(wallet, ctx);

    const result = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: ctx,
      requestOrigin: "https://evil.example",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("wrong_domain");
  });

  it("rejects signature over modified message bytes", async () => {
    const wallet = Keypair.generate();
    const ctx = "ctx-modified";
    const { issued } = await issueAndSign(wallet, ctx);
    const tampered = `${issued.challenge.message}\nextra-line`;
    const badSig = signMessage(tampered, wallet.secretKey);

    const result = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature: badSig,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_signature");
  });

  it("rejects a second verify after successful consumption (replay)", async () => {
    const wallet = Keypair.generate();
    const ctx = "ctx-sequential-replay";
    const { issued, signature } = await issueAndSign(wallet, ctx);

    const first = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
    });
    expect(first.ok).toBe(true);

    const second = await verifyAccountSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe("replay");
  });

  it("does not merge accounts when two wallets sign in separately", async () => {
    const a = Keypair.generate();
    const b = Keypair.generate();
    const ctxA = "ctx-a";
    const ctxB = "ctx-b";
    const packA = await issueAndSign(a, ctxA);
    const packB = await issueAndSign(b, ctxB);

    const va = await verifyAccountSolanaAuth({
      challengeId: packA.issued.challenge.challenge_id,
      walletAddress: a.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature: packA.signature,
      sessionContext: ctxA,
      requestOrigin: ORIGIN,
    });
    const vb = await verifyAccountSolanaAuth({
      challengeId: packB.issued.challenge.challenge_id,
      walletAddress: b.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature: packB.signature,
      sessionContext: ctxB,
      requestOrigin: ORIGIN,
    });
    expect(va.ok && vb.ok).toBe(true);
    if (!va.ok || !vb.ok) return;
    expect(va.accountId).not.toBe(vb.accountId);
  });
});
