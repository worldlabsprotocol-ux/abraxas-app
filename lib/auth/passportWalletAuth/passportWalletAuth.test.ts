// FILE: lib/auth/passportWalletAuth/passportWalletAuth.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { PASSPORT_WALLET_ACTIONS } from "./contract";
import { buildPassportWalletAuthMessage, encodePassportWalletMessage } from "./message";
import { verifyPassportWalletPersonalMessage } from "./verifySignature";
import { issuePassportWalletAuthChallenge, verifyPassportWalletAuth } from "./service";
import { linkLegacyPassportWallet } from "./legacyLink";
import * as store from "./store";
import * as identity from "./identity";
import * as legacyLink from "./legacyLink";
import * as admin from "@/lib/supabase/admin";

const ORIGIN = "https://demo.abraxasworld.xyz";
const NETWORK = "sui:devnet";

describe("passport wallet auth", () => {
  const keypair = Ed25519Keypair.generate();
  const walletAddress = normalizeSuiAddress(keypair.getPublicKey().toSuiAddress());

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_SUI_NETWORK = "devnet";
  });

  it("verifies valid personal message signatures", async () => {
    const message = buildPassportWalletAuthMessage({
      origin: ORIGIN,
      walletAddress,
      suiNetwork: NETWORK,
      intendedAction: PASSPORT_WALLET_ACTIONS.passportSignIn,
      nonce: "nonce-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      sessionContext: "ctx-1",
    });
    const { signature } = await keypair.signPersonalMessage(encodePassportWalletMessage(message));
    const ok = await verifyPassportWalletPersonalMessage({
      message,
      signature,
      walletAddress,
    });
    expect(ok).toBe(true);
  });

  it("rejects invalid signatures", async () => {
    const message = "bad";
    const ok = await verifyPassportWalletPersonalMessage({
      message,
      signature: Buffer.alloc(64).toString("base64"),
      walletAddress,
    });
    expect(ok).toBe(false);
  });

  it("rejects wrong domain on verify", async () => {
    const message = buildPassportWalletAuthMessage({
      origin: ORIGIN,
      walletAddress,
      suiNetwork: NETWORK,
      intendedAction: PASSPORT_WALLET_ACTIONS.passportSignIn,
      nonce: "n2",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      sessionContext: "ctx-2",
    });
    vi.spyOn(store, "consumePassportWalletChallenge").mockResolvedValue({
      id: "pwac_test",
      wallet_address: walletAddress,
      sui_network: NETWORK,
      origin: ORIGIN,
      intended_action: PASSPORT_WALLET_ACTIONS.passportSignIn,
      session_context_hash: store.hashSessionContext("ctx-2"),
      nonce: "n2",
      message,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: null,
    });
    vi.spyOn(identity, "resolvePassportWalletIdentity").mockResolvedValue({
      ok: true,
      suiAddress: walletAddress,
      created: true,
    });

    const { signature } = await keypair.signPersonalMessage(encodePassportWalletMessage(message));
    const result = await verifyPassportWalletAuth({
      challengeId: "pwac_test",
      walletAddress,
      suiNetwork: NETWORK,
      signature,
      sessionContext: "ctx-2",
      requestOrigin: "https://evil.example",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_domain");
  });

  it("rejects replay when consume returns null", async () => {
    vi.spyOn(store, "consumePassportWalletChallenge").mockResolvedValue(null);
    const result = await verifyPassportWalletAuth({
      challengeId: "pwac_missing",
      walletAddress,
      suiNetwork: NETWORK,
      signature: "abc",
      sessionContext: "ctx",
      requestOrigin: ORIGIN,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("replay");
  });

  it("rejects expired challenges", async () => {
    const message = buildPassportWalletAuthMessage({
      origin: ORIGIN,
      walletAddress,
      suiNetwork: NETWORK,
      intendedAction: PASSPORT_WALLET_ACTIONS.passportSignIn,
      nonce: "exp",
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
      sessionContext: "ctx-exp",
    });
    vi.spyOn(store, "consumePassportWalletChallenge").mockResolvedValue({
      id: "pwac_exp",
      wallet_address: walletAddress,
      sui_network: NETWORK,
      origin: ORIGIN,
      intended_action: PASSPORT_WALLET_ACTIONS.passportSignIn,
      session_context_hash: store.hashSessionContext("ctx-exp"),
      nonce: "exp",
      message,
      expires_at: new Date(Date.now() - 1_000).toISOString(),
      consumed_at: null,
    });
    const result = await verifyPassportWalletAuth({
      challengeId: "pwac_exp",
      walletAddress,
      suiNetwork: NETWORK,
      signature: "abc",
      sessionContext: "ctx-exp",
      requestOrigin: ORIGIN,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("expired");
  });

  it("rejects legacy link when session address mismatches wallet", async () => {
    vi.spyOn(store, "consumePassportWalletChallenge").mockResolvedValue(null);
    const result = await linkLegacyPassportWallet({
      challengeId: "pwac_link",
      walletAddress,
      suiNetwork: NETWORK,
      signature: "abc",
      sessionContext: "ctx",
      requestOrigin: ORIGIN,
      sessionSuiAddress: Ed25519Keypair.generate().getPublicKey().toSuiAddress(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unauthorized");
  });

  it("allows wallet login when legacy grant exists", async () => {
    vi.spyOn(legacyLink, "hasPassportWalletLoginGrant").mockResolvedValue(true);
    vi.spyOn(admin, "requireSupabaseAdmin").mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { provider: "google", oauth_sub: "sub", sui_address: walletAddress },
            }),
          }),
        }),
        insert: () => ({ error: null }),
      }),
    } as never);
    const resolved = await identity.resolvePassportWalletIdentity(walletAddress);
    expect(resolved.ok).toBe(true);
  });

  it("issues challenges for supported networks", async () => {
    vi.spyOn(store, "insertPassportWalletChallenge").mockResolvedValue(undefined);
    const issued = await issuePassportWalletAuthChallenge({
      origin: ORIGIN,
      walletAddress,
      suiNetwork: NETWORK,
      intendedAction: PASSPORT_WALLET_ACTIONS.partnerVerify,
      sessionContext: "ctx-3",
    });
    expect(issued.ok).toBe(true);
    if (issued.ok) {
      expect(issued.challenge.wallet_address).toBe(walletAddress);
      expect(issued.challenge.intended_action).toBe(PASSPORT_WALLET_ACTIONS.partnerVerify);
    }
  });
});
