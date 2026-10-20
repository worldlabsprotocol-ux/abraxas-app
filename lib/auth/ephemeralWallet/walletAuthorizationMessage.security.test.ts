// FILE: lib/auth/ephemeralWallet/walletAuthorizationMessage.security.test.ts

import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { verifyPassportSolanaPersonalMessage } from "@/lib/auth/passportSolanaAuth/verifySignature";
import { buildEphemeralWalletSignInMessage } from "./message";
import { buildWalletAuthorizationMessage, WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY } from "./protocolEnvelope";
import { resolveWalletActionHumanContext } from "./actionDisplayContext";

describe("wallet authorization message security binding", () => {
  const keypair = Keypair.generate();
  const wallet = keypair.publicKey.toBase58();

  const base = {
    domain: "localhost:3000",
    walletAddress: wallet,
    uri: "https://localhost:3000/account/applications",
    solanaNetwork: "devnet",
    nonce: "nonce_secure_1",
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:05:00.000Z",
    challengeId: "ewch_secure_test",
    origin: "https://localhost:3000",
  };

  it("rejects signature when a human line is tampered after issuance", () => {
    const message = buildEphemeralWalletSignInMessage(base);
    const bytes = new TextEncoder().encode(message);
    const signature = Buffer.from(nacl.sign.detached(bytes, keypair.secretKey)).toString("base64");
    expect(
      verifyPassportSolanaPersonalMessage({ message, signature, walletAddress: wallet }),
    ).toBe(true);

    const tampered = message.replace("No funds will move.", "No funds will move!!!");
    expect(
      verifyPassportSolanaPersonalMessage({ message: tampered, signature, walletAddress: wallet }),
    ).toBe(false);
  });

  it("rejects scoped signature when authorization consequence is tampered", () => {
    const human = resolveWalletActionHumanContext({
      operation: "sandbox:verification:test",
      policyId: "wallet_control",
    });
    const message = buildWalletAuthorizationMessage({
      domain: "localhost:3000",
      audience: "abraxas_ephemeral_wallet",
      walletAddress: wallet,
      uri: "https://localhost:3000/api/test",
      solanaNetwork: "devnet",
      nonce: "nonce_secure_2",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:05:00.000Z",
      requestId: "ewac_secure_test",
      origin: "https://localhost:3000",
      purpose: WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY,
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws:policy:wallet_control",
      policyId: "wallet_control",
      human,
    });
    const bytes = new TextEncoder().encode(message);
    const signature = Buffer.from(nacl.sign.detached(bytes, keypair.secretKey)).toString("base64");
    const tampered = message.replace("Recipient:", "Recipient: attacker.example");
    expect(
      verifyPassportSolanaPersonalMessage({ message: tampered, signature, walletAddress: wallet }),
    ).toBe(false);
  });

  it("rejects signature when authorization record purpose is substituted", () => {
    const message = buildEphemeralWalletSignInMessage(base);
    const bytes = new TextEncoder().encode(message);
    const signature = Buffer.from(nacl.sign.detached(bytes, keypair.secretKey)).toString("base64");
    const tampered = message.replace("abraxas_wallet_sign_in_v1", "abraxas_action_sandbox_enter_v1");
    expect(
      verifyPassportSolanaPersonalMessage({ message: tampered, signature, walletAddress: wallet }),
    ).toBe(false);
  });
});
