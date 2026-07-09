// FILE: lib/walletAuthority/evmSiwe.test.ts
import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import {
  buildSiweMessage,
  createEvmChallengePayload,
  validateSiweMessage,
  verifyEvmBindingSignature,
} from "@/lib/walletAuthority/evmSiwe";

const TEST_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OTHER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78627d";
const account = privateKeyToAccount(TEST_KEY);
const otherAccount = privateKeyToAccount(OTHER_KEY);

function baseExpected() {
  const payload = createEvmChallengePayload({
    domain: "abraxas-app.vercel.app",
    address: account.address,
    chainId: 1,
  });
  return {
    message: payload.message,
    challengeId: payload.challengeId,
    expiresAt: payload.expiresAt,
  };
}

describe("SIWE message validation", () => {
  it("accepts a valid message", () => {
    const { message, challengeId } = baseExpected();
    const result = validateSiweMessage(message, {
      domain: "abraxas-app.vercel.app",
      chainId: 1,
      nonce: challengeId,
      address: account.address,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects wrong domain", () => {
    const { message, challengeId } = baseExpected();
    const result = validateSiweMessage(message, {
      domain: "evil.example.com",
      chainId: 1,
      nonce: challengeId,
      address: account.address,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("domain_mismatch");
  });

  it("rejects wrong chain ID", () => {
    const { message, challengeId } = baseExpected();
    const result = validateSiweMessage(message, {
      domain: "abraxas-app.vercel.app",
      chainId: 8453,
      nonce: challengeId,
      address: account.address,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("chain_id_mismatch");
  });

  it("rejects wrong nonce", () => {
    const { message } = baseExpected();
    const result = validateSiweMessage(message, {
      domain: "abraxas-app.vercel.app",
      chainId: 1,
      nonce: "deadbeefdeadbeefdeadbeefdeadbeef",
      address: account.address,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("nonce_mismatch");
  });

  it("rejects tampered URI", () => {
    const { message, challengeId } = baseExpected();
    const tampered = message.replace(
      "URI: https://abraxas-app.vercel.app",
      "URI: https://evil.example.com",
    );
    const result = validateSiweMessage(tampered, {
      domain: "abraxas-app.vercel.app",
      chainId: 1,
      nonce: challengeId,
      address: account.address,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(["uri_mismatch", "message_tampered"]).toContain(result.reason);
  });

  it("rejects expired nonce via expiration time", () => {
    const issuedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const expirationTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const message = buildSiweMessage({
      domain: "abraxas-app.vercel.app",
      address: account.address,
      chainId: 1,
      nonce: "abc123",
      issuedAt,
      expirationTime,
    });
    const result = validateSiweMessage(message, {
      domain: "abraxas-app.vercel.app",
      chainId: 1,
      nonce: "abc123",
      address: account.address,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(["expiration_passed", "issued_at_too_old"]).toContain(result.reason);
  });

  it("rejects reused nonce when expiration passed", () => {
    const { message, challengeId } = baseExpected();
    const result = validateSiweMessage(message, {
      domain: "abraxas-app.vercel.app",
      chainId: 1,
      nonce: challengeId,
      address: account.address,
    }, Date.parse("2099-01-01T00:00:00.000Z"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(["expiration_passed", "issued_at_too_old"]).toContain(result.reason);
  });
});

describe("SIWE signature verification", () => {
  it("accepts signature from expected signer", async () => {
    const { message, challengeId } = baseExpected();
    const signature = await account.signMessage({ message });
    const valid = await verifyEvmBindingSignature({
      message,
      signature,
      expectedAddress: account.address,
      expectedDomain: "abraxas-app.vercel.app",
      expectedChainId: 1,
      expectedNonce: challengeId,
    });
    expect(valid).toBe(true);
  });

  it("rejects wrong signer", async () => {
    const { message, challengeId } = baseExpected();
    const signature = await otherAccount.signMessage({ message });
    const valid = await verifyEvmBindingSignature({
      message,
      signature,
      expectedAddress: account.address,
      expectedDomain: "abraxas-app.vercel.app",
      expectedChainId: 1,
      expectedNonce: challengeId,
    });
    expect(valid).toBe(false);
  });
});
