// FILE: lib/settlement/settlement.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import {
  computeReceiptCommitmentFromPayloadHash,
  hashPartnerIdForSettlement,
  hashPolicyIdForSettlement,
  applicationIdToBytes32,
} from "@/lib/settlement/receiptCommitment";
import {
  buildSettlementTypedDataMessage,
  generateSettlementNonce,
  signSettlementAuthorization,
  SETTLEMENT_TYPED_DATA_TYPES,
  buildSettlementTypedDataDomain,
} from "@/lib/settlement/signing";
import { displayUsdcToMicro, microUsdcToDisplay } from "@/lib/settlement/SettlementAdapter";
import { quoteSettlementFees } from "@/lib/settlement/accountingHooks";
import { normalizeEvmAddress, validateSettlementAmount } from "@/lib/settlement/validation";
import type { ArcSettlementConfigRow, SettlementAuthorizationPayload } from "@/lib/settlement/types";

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const TEST_CONTRACT = "0x00000000000000000000000000000000000000aa" as const;

describe("receipt commitment", () => {
  it("is domain separated and deterministic", () => {
    const hash = "a".repeat(64);
    const c1 = computeReceiptCommitmentFromPayloadHash(hash);
    const c2 = computeReceiptCommitmentFromPayloadHash(hash);
    expect(c1).toBe(c2);
    expect(c1).not.toContain("email");
  });

  it("rejects invalid payload hash", () => {
    expect(() => computeReceiptCommitmentFromPayloadHash("bad")).toThrow();
  });
});

describe("settlement signing", () => {
  const originalKey = process.env.ABRAXAS_SETTLEMENT_SIGNER_PRIVATE_KEY;

  beforeEach(() => {
    process.env.ABRAXAS_SETTLEMENT_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterEach(() => {
    if (originalKey) process.env.ABRAXAS_SETTLEMENT_SIGNER_PRIVATE_KEY = originalKey;
    else delete process.env.ABRAXAS_SETTLEMENT_SIGNER_PRIVATE_KEY;
  });

  it("signs EIP-712 authorization with domain separation", async () => {
    const account = privateKeyToAccount(TEST_PRIVATE_KEY);
    const appId = applicationIdToBytes32("00000000-0000-4000-8000-000000000001");
    expect(appId).toMatch(/^0x[a-f0-9]{64}$/i);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const payload: SettlementAuthorizationPayload = {
      chainId: 5042002n,
      environment: "sandbox",
      partnerApplicationId: appId,
      partnerIdHash: hashPartnerIdForSettlement("partner-demo"),
      policyIdHash: hashPolicyIdForSettlement("policy-demo"),
      policyVersion: 1n,
      eligibleWallet: account.address,
      recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      token: "0x3600000000000000000000000000000000000000",
      amountMicroUsdc: 10000n,
      amountKind: "exact",
      actionType: "0x" + "ab".repeat(32),
      nonce: generateSettlementNonce(),
      issuedAt: now,
      expiresAt: now + 900n,
      receiptCommitment: computeReceiptCommitmentFromPayloadHash("b".repeat(64)),
      settlementReference: "0x" + "cd".repeat(32),
    };

    const { signature, signerAddress } = await signSettlementAuthorization(payload, TEST_CONTRACT);
    expect(signature).toMatch(/^0x[a-f0-9]+$/i);
    expect(signerAddress.toLowerCase()).toBe(account.address.toLowerCase());

    const domain = buildSettlementTypedDataDomain(5042002, TEST_CONTRACT);
    expect(domain.name).toBe("AbraxasSettlement");
    expect(buildSettlementTypedDataMessage(payload).chainId).toBe(5042002n);
    expect(SETTLEMENT_TYPED_DATA_TYPES.SettlementAuthorization.length).toBeGreaterThan(10);
  });
});

describe("USDC decimal handling", () => {
  it("converts display to micro without floating point", () => {
    expect(displayUsdcToMicro("1.5")).toBe(1_500_000n);
    expect(displayUsdcToMicro("0.000001")).toBe(1n);
    expect(microUsdcToDisplay(1_500_000n)).toBe("1.5");
  });

  it("rejects invalid amounts", () => {
    expect(() => displayUsdcToMicro("1.1234567")).toThrow();
  });
});

describe("fee quote", () => {
  it("returns zero fee by default", () => {
    const quote = quoteSettlementFees(10000n);
    expect(quote.feeMicroUsdc).toBe(0n);
    expect(quote.feeActive).toBe(false);
  });
});

describe("validation", () => {
  const config: ArcSettlementConfigRow = {
    id: "cfg",
    application_id: "app",
    partner_id: "partner",
    enabled: true,
    arc_environment: "arc_testnet",
    chain_id: 5042002,
    settlement_contract_address: TEST_CONTRACT,
    usdc_token_address: "0x3600000000000000000000000000000000000000",
    approved_recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    minimum_amount_micro_usdc: 1000,
    maximum_amount_micro_usdc: 1000000,
    policy_id: "policy",
    policy_version: 1,
    authorization_lifetime_seconds: 900,
    reusable_authorization: false,
    paused: false,
    created_at: "",
    updated_at: "",
  };

  it("normalizes EVM addresses", () => {
    const addr = normalizeEvmAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    expect(addr).toBeTruthy();
    expect(normalizeEvmAddress("not-an-address")).toBeNull();
  });

  it("enforces amount bounds", () => {
    expect(validateSettlementAmount(config, 500n).ok).toBe(false);
    expect(validateSettlementAmount(config, 5000n).ok).toBe(true);
    expect(validateSettlementAmount(config, 2_000_000n).ok).toBe(false);
  });
});
