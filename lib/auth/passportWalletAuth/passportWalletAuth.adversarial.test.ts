// FILE: lib/auth/passportWalletAuth/passportWalletAuth.adversarial.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { PASSPORT_WALLET_ACTIONS } from "./contract";
import { buildPassportWalletAuthMessage, encodePassportWalletMessage } from "./message";
import { consumeAndValidatePassportWalletChallenge } from "./challengeVerify";
import { verifyPassportWalletAuth } from "./service";
import * as store from "./store";

const ORIGIN = "https://demo.abraxasworld.xyz";
const NETWORK = "sui:devnet";

describe("passport wallet auth adversarial", () => {
  const keypair = Ed25519Keypair.generate();
  const walletAddress = normalizeSuiAddress(keypair.getPublicKey().toSuiAddress());

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_SUI_NETWORK = "devnet";
    process.env.NEXT_PUBLIC_APP_URL = ORIGIN;
    process.env.ABRAXAS_PASSPORT_WALLET_TRUSTED_ORIGINS = ORIGIN;
  });

  async function signedRow(input: {
    action: string;
    network?: string;
    ctx?: string;
  }) {
    const ctx = input.ctx ?? "ctx-adv";
    const network = input.network ?? NETWORK;
    const message = buildPassportWalletAuthMessage({
      origin: ORIGIN,
      walletAddress,
      suiNetwork: network,
      intendedAction: input.action as typeof PASSPORT_WALLET_ACTIONS.passportSignIn,
      nonce: "nonce-adv",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      sessionContext: ctx,
    });
    const { signature } = await keypair.signPersonalMessage(encodePassportWalletMessage(message));
    return { message, signature, ctx, network };
  }

  it("rejects action substitution between partner_verify and passport_sign_in", async () => {
    const { message, signature, ctx } = await signedRow({
      action: PASSPORT_WALLET_ACTIONS.partnerVerify,
    });
    vi.spyOn(store, "consumePassportWalletChallenge").mockResolvedValue({
      id: "pwac_action",
      wallet_address: walletAddress,
      sui_network: NETWORK,
      origin: ORIGIN,
      intended_action: PASSPORT_WALLET_ACTIONS.partnerVerify,
      session_context_hash: store.hashSessionContext(ctx),
      nonce: "nonce-adv",
      message,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: null,
    });

    const result = await verifyPassportWalletAuth({
      challengeId: "pwac_action",
      walletAddress,
      suiNetwork: NETWORK,
      signature,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
      expectedIntendedAction: PASSPORT_WALLET_ACTIONS.passportSignIn,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_action");
  });

  it("rejects link_legacy_wallet challenges on verify path", async () => {
    const { message, signature, ctx } = await signedRow({
      action: PASSPORT_WALLET_ACTIONS.linkLegacyWallet,
    });
    vi.spyOn(store, "consumePassportWalletChallenge").mockResolvedValue({
      id: "pwac_link",
      wallet_address: walletAddress,
      sui_network: NETWORK,
      origin: ORIGIN,
      intended_action: PASSPORT_WALLET_ACTIONS.linkLegacyWallet,
      session_context_hash: store.hashSessionContext(ctx),
      nonce: "nonce-adv",
      message,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: null,
    });

    const result = await consumeAndValidatePassportWalletChallenge({
      challengeId: "pwac_link",
      walletAddress,
      suiNetwork: NETWORK,
      signature,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
      expectedIntendedAction: PASSPORT_WALLET_ACTIONS.passportSignIn,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_action");
  });

  it("rejects wrong submitted network even when challenge stored devnet", async () => {
    const { message, signature, ctx } = await signedRow({ action: PASSPORT_WALLET_ACTIONS.passportSignIn });
    vi.spyOn(store, "consumePassportWalletChallenge").mockResolvedValue({
      id: "pwac_net",
      wallet_address: walletAddress,
      sui_network: NETWORK,
      origin: ORIGIN,
      intended_action: PASSPORT_WALLET_ACTIONS.passportSignIn,
      session_context_hash: store.hashSessionContext(ctx),
      nonce: "nonce-adv",
      message,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: null,
    });

    const result = await consumeAndValidatePassportWalletChallenge({
      challengeId: "pwac_net",
      walletAddress,
      suiNetwork: "sui:testnet",
      signature,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
      expectedIntendedAction: PASSPORT_WALLET_ACTIONS.passportSignIn,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_network");
  });

  it("rejects malformed chain identifiers at consume", async () => {
    const { message, signature, ctx } = await signedRow({
      action: PASSPORT_WALLET_ACTIONS.passportSignIn,
      network: "sui:devnet:evil",
    });
    vi.spyOn(store, "consumePassportWalletChallenge").mockResolvedValue({
      id: "pwac_malformed",
      wallet_address: walletAddress,
      sui_network: "sui:devnet:evil",
      origin: ORIGIN,
      intended_action: PASSPORT_WALLET_ACTIONS.passportSignIn,
      session_context_hash: store.hashSessionContext(ctx),
      nonce: "nonce-adv",
      message,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: null,
    });

    const result = await consumeAndValidatePassportWalletChallenge({
      challengeId: "pwac_malformed",
      walletAddress,
      suiNetwork: "sui:devnet:evil",
      signature,
      sessionContext: ctx,
      requestOrigin: ORIGIN,
      expectedIntendedAction: PASSPORT_WALLET_ACTIONS.passportSignIn,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_network");
  });

  it("models concurrent nonce replay as single consume", async () => {
    const consume = vi.spyOn(store, "consumePassportWalletChallenge");
    consume.mockResolvedValueOnce({
      id: "pwac_once",
      wallet_address: walletAddress,
      sui_network: NETWORK,
      origin: ORIGIN,
      intended_action: PASSPORT_WALLET_ACTIONS.passportSignIn,
      session_context_hash: store.hashSessionContext("ctx-replay"),
      nonce: "once",
      message: "m",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: null,
    });
    consume.mockResolvedValueOnce(null);

    const base = {
      challengeId: "pwac_once",
      walletAddress,
      suiNetwork: NETWORK,
      signature: "sig",
      sessionContext: "ctx-replay",
      requestOrigin: ORIGIN,
      expectedIntendedAction: PASSPORT_WALLET_ACTIONS.passportSignIn,
    } as const;

    const first = await consumeAndValidatePassportWalletChallenge(base);
    expect(first.ok).toBe(false);

    const second = await consumeAndValidatePassportWalletChallenge(base);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("replay");
  });
});
