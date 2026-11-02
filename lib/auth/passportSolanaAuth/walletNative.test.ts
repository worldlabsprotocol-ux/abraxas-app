import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Keypair } from "@solana/web3.js";
import { NextRequest } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { encodePassportSolanaMessage } from "./message";
import { issueWalletNativeChallenge, verifyWalletNativeChallenge, walletNativeSubjectId } from "./walletNative";
import { BROWSER_SESSION_COOKIE, issueBrowserSessionFromInput, resolveBrowserSession } from "@/lib/auth/browserSession";

const ORIGIN = "https://abraxasworld.xyz";

describe("wallet-native Passport sign-in", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "wallet-native-test-secret";
    process.env.NEXT_PUBLIC_SOLANA_NETWORK = "devnet";
  });

  afterEach(() => vi.useRealTimers());

  it("verifies wallet control without a persistence binding", async () => {
    const wallet = Keypair.generate();
    const issued = await issueWalletNativeChallenge({
      origin: ORIGIN,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      sessionContext: "browser-context",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const signature = bs58.encode(nacl.sign.detached(encodePassportSolanaMessage(issued.challenge.message), wallet.secretKey));
    const verified = await verifyWalletNativeChallenge({
      token: issued.token,
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: "browser-context",
      requestOrigin: ORIGIN,
    });

    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.holderSubjectId).toBe(walletNativeSubjectId(verified.caip10));
  });

  it("rejects a challenge outside its browser context", async () => {
    const wallet = Keypair.generate();
    const issued = await issueWalletNativeChallenge({
      origin: ORIGIN,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      sessionContext: "correct-context",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const signature = bs58.encode(nacl.sign.detached(encodePassportSolanaMessage(issued.challenge.message), wallet.secretKey));

    const verified = await verifyWalletNativeChallenge({
      token: issued.token,
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: "wrong-context",
      requestOrigin: ORIGIN,
    });
    expect(verified).toEqual({ ok: false, code: "challenge_mismatch" });
  });

  it("atomically rejects a second use of the same signed challenge", async () => {
    const wallet = Keypair.generate();
    const issued = await issueWalletNativeChallenge({
      origin: ORIGIN,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      sessionContext: "single-use-context",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const signature = bs58.encode(nacl.sign.detached(encodePassportSolanaMessage(issued.challenge.message), wallet.secretKey));
    const input = {
      token: issued.token,
      challengeId: issued.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature,
      sessionContext: "single-use-context",
      requestOrigin: ORIGIN,
    };

    const [first, second] = await Promise.all([
      verifyWalletNativeChallenge(input),
      verifyWalletNativeChallenge(input),
    ]);
    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second].filter((result) => !result.ok && result.code === "replay")).toHaveLength(1);
  });

  it("rejects expired, forged, and incorrectly signed challenges", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const wallet = Keypair.generate();
    const attacker = Keypair.generate();

    const expired = await issueWalletNativeChallenge({
      origin: ORIGIN, walletAddress: wallet.publicKey.toBase58(), solanaNetwork: "devnet", sessionContext: "expired",
    });
    expect(expired.ok).toBe(true);
    if (!expired.ok) return;
    vi.advanceTimersByTime(6 * 60 * 1000);
    const expiredSignature = bs58.encode(nacl.sign.detached(encodePassportSolanaMessage(expired.challenge.message), wallet.secretKey));
    expect((await verifyWalletNativeChallenge({
      token: expired.token, challengeId: expired.challenge.challenge_id, walletAddress: wallet.publicKey.toBase58(),
      solanaNetwork: "devnet", signature: expiredSignature, sessionContext: "expired", requestOrigin: ORIGIN,
    })).code).toBe("expired_or_invalid_challenge");

    vi.setSystemTime(new Date("2026-01-01T01:00:00.000Z"));
    const forged = await issueWalletNativeChallenge({
      origin: ORIGIN, walletAddress: wallet.publicKey.toBase58(), solanaNetwork: "devnet", sessionContext: "forged",
    });
    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect((await verifyWalletNativeChallenge({
      token: `${forged.token.slice(0, -1)}x`, challengeId: forged.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(), solanaNetwork: "devnet",
      signature: bs58.encode(nacl.sign.detached(encodePassportSolanaMessage(forged.challenge.message), attacker.secretKey)),
      sessionContext: "forged", requestOrigin: ORIGIN,
    })).ok).toBe(false);

    const badSignature = await issueWalletNativeChallenge({
      origin: ORIGIN, walletAddress: wallet.publicKey.toBase58(), solanaNetwork: "devnet", sessionContext: "bad-signature",
    });
    expect(badSignature.ok).toBe(true);
    if (!badSignature.ok) return;
    expect(await verifyWalletNativeChallenge({
      token: badSignature.token, challengeId: badSignature.challenge.challenge_id,
      walletAddress: wallet.publicKey.toBase58(), solanaNetwork: "devnet",
      signature: bs58.encode(nacl.sign.detached(encodePassportSolanaMessage(badSignature.challenge.message), attacker.secretKey)),
      sessionContext: "bad-signature", requestOrigin: ORIGIN,
    })).toEqual({ ok: false, code: "invalid_signature" });
  });

  it("binds challenges to the exact origin, network, wallet, and browser context", async () => {
    const wallet = Keypair.generate();
    const otherWallet = Keypair.generate();
    for (const mismatch of ["origin", "network", "wallet", "context"] as const) {
      const issued = await issueWalletNativeChallenge({
        origin: ORIGIN, walletAddress: wallet.publicKey.toBase58(), solanaNetwork: "devnet", sessionContext: `ctx-${mismatch}`,
      });
      expect(issued.ok).toBe(true);
      if (!issued.ok) continue;
      const signature = bs58.encode(nacl.sign.detached(encodePassportSolanaMessage(issued.challenge.message), wallet.secretKey));
      const result = await verifyWalletNativeChallenge({
        token: issued.token,
        challengeId: issued.challenge.challenge_id,
        walletAddress: mismatch === "wallet" ? otherWallet.publicKey.toBase58() : wallet.publicKey.toBase58(),
        solanaNetwork: mismatch === "network" ? "mainnet-beta" : "devnet",
        signature,
        sessionContext: mismatch === "context" ? "wrong-context" : `ctx-${mismatch}`,
        requestOrigin: mismatch === "origin" ? "https://evil.example" : ORIGIN,
      });
      expect(result.ok).toBe(false);
    }
  });

  it("cryptographically authenticates wallet sessions and separates switched wallets", async () => {
    const firstCaip = "solana:devnet:11111111111111111111111111111111";
    const secondCaip = "solana:devnet:SysvarRent111111111111111111111111111111111";
    const firstSubject = walletNativeSubjectId(firstCaip);
    expect(firstSubject).not.toBe(walletNativeSubjectId(secondCaip));

    const token = await issueBrowserSessionFromInput({
      authMethod: "solana_wallet", holderSubjectId: firstSubject, walletCaip10: firstCaip,
    });
    expect(token).toBeTruthy();
    const request = new NextRequest(ORIGIN);
    request.cookies.set(BROWSER_SESSION_COOKIE, token!);
    expect((await resolveBrowserSession(request))?.holderSubjectId).toBe(firstSubject);

    const forged = new NextRequest(ORIGIN);
    forged.cookies.set(BROWSER_SESSION_COOKIE, `${token!.slice(0, -1)}x`);
    expect(await resolveBrowserSession(forged)).toBeNull();
  });
});
