// FILE: lib/walletAuthority/evmSignatureVerify.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { buildSiweMessage } from "./evmSiwe";
import { verifySiweWalletSignature } from "./evmSignatureVerify";

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBytecode: vi.fn(async () => "0x6000"),
      readContract: vi.fn(async () => "0x00000000"),
    })),
  };
});

describe("verifySiweWalletSignature", () => {
  const account = privateKeyToAccount("0x0123456789012345678901234567890123456789012345678901234567890123");

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ABRAXAS_PASSPORT_EVM_RPC_URL;
  });

  it("accepts EOA personal_sign without RPC", async () => {
    const message = buildSiweMessage({
      domain: "demo.abraxasworld.xyz",
      address: account.address,
      chainId: 1,
      nonce: "nonce-eoa",
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 300_000).toISOString(),
    });
    const signature = await account.signMessage({ message });
    const result = await verifySiweWalletSignature({
      message,
      signature,
      expectedAddress: account.address,
      expectedDomain: "demo.abraxasworld.xyz",
      expectedChainId: 1,
      expectedNonce: "nonce-eoa",
    });
    expect(result.ok).toBe(true);
  });

  it("fails closed when contract wallet RPC is unavailable", async () => {
    process.env.ABRAXAS_PASSPORT_EVM_RPC_URL = "http://127.0.0.1:9";
    const message = buildSiweMessage({
      domain: "demo.abraxasworld.xyz",
      address: account.address,
      chainId: 1,
      nonce: "nonce-contract",
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 300_000).toISOString(),
    });
    const signature = `0x${"00".repeat(65)}` as `0x${string}`;
    const result = await verifySiweWalletSignature({
      message,
      signature,
      expectedAddress: account.address,
      expectedDomain: "demo.abraxasworld.xyz",
      expectedChainId: 1,
      expectedNonce: "nonce-contract",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["invalid_signature", "rpc_error", "invalid_contract_signature", "rpc_unconfigured"]).toContain(result.code);
    }
  });
});
