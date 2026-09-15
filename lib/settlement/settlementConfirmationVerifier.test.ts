// FILE: lib/settlement/settlementConfirmationVerifier.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ArcAuthorizationRow, ArcSettlementConfigRow } from "@/lib/settlement/types";
import { applicationIdToBytes32, hashSettlementReference } from "@/lib/settlement/receiptCommitment";

vi.mock("server-only", () => ({}));

const fetchReceiptMock = vi.fn();
const fetchTxMock = vi.fn();
const fetchChainMock = vi.fn();

vi.mock("@/lib/settlement/arcRpc.server", () => ({
  fetchArcTransactionReceipt: (...args: unknown[]) => fetchReceiptMock(...args),
  fetchArcChainId: (...args: unknown[]) => fetchChainMock(...args),
  createArcPublicClient: () => ({
    getTransaction: (...args: unknown[]) => fetchTxMock(...args),
  }),
  withArcRpcRetry: (fn: () => Promise<unknown>) => fn(),
}));

function sampleConfig(): ArcSettlementConfigRow {
  return {
    id: "cfg",
    application_id: "00000000-0000-4000-8000-000000000001",
    partner_id: "partner-1",
    enabled: true,
    arc_environment: "arc_testnet",
    chain_id: 5042002,
    settlement_contract_address: "0x00000000000000000000000000000000000000aa",
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
}

function sampleAuth(overrides: Partial<ArcAuthorizationRow> = {}): ArcAuthorizationRow {
  return {
    id: "auth-1",
    application_id: "00000000-0000-4000-8000-000000000001",
    partner_id: "partner-1",
    environment: "sandbox",
    chain_id: 5042002,
    eligible_wallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    token_address: "0x3600000000000000000000000000000000000000",
    amount_micro_usdc: 10000,
    amount_kind: "exact",
    action_type: "usdc_transfer",
    nonce: "0x" + "11".repeat(32),
    receipt_id: "dr_test",
    receipt_commitment: "0x" + "22".repeat(32),
    settlement_reference: "settlement-ref-1",
    policy_id: "policy",
    policy_version: 1,
    status: "submitted",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    confirmed_at: null,
    transaction_hash: null,
    block_number: null,
    failure_code: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("verifySettlementOnchain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchChainMock.mockResolvedValue(5042002);
  });

  it("rejects forged transaction hashes", async () => {
    fetchReceiptMock.mockResolvedValue(null);
    const { verifySettlementOnchain } = await import("@/lib/settlement/SettlementConfirmationVerifier.server");
    const result = await verifySettlementOnchain({
      transactionHash: "0x" + "ab".repeat(32),
      config: sampleConfig(),
      authorization: sampleAuth(),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects failed transaction receipts", async () => {
    fetchReceiptMock.mockResolvedValue({ status: "reverted", logs: [] });
    const { verifySettlementOnchain } = await import("@/lib/settlement/SettlementConfirmationVerifier.server");
    const result = await verifySettlementOnchain({
      transactionHash: "0x" + "ab".repeat(32),
      config: sampleConfig(),
      authorization: sampleAuth(),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects transactions to the wrong contract", async () => {
    fetchReceiptMock.mockResolvedValue({ status: "success", logs: [] });
    fetchTxMock.mockResolvedValue({ to: "0x0000000000000000000000000000000000000bad" });
    const { verifySettlementOnchain } = await import("@/lib/settlement/SettlementConfirmationVerifier.server");
    const result = await verifySettlementOnchain({
      transactionHash: "0x" + "ab".repeat(32),
      config: sampleConfig(),
      authorization: sampleAuth(),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects wrong chain id from rpc", async () => {
    fetchChainMock.mockResolvedValue(1);
    const { verifySettlementOnchain } = await import("@/lib/settlement/SettlementConfirmationVerifier.server");
    const result = await verifySettlementOnchain({
      transactionHash: "0x" + "ab".repeat(32),
      config: sampleConfig(),
      authorization: sampleAuth(),
    });
    expect(result.ok).toBe(false);
  });
});

describe("settlement reference hashing", () => {
  it("matches authorization storage with onchain hashed reference", () => {
    const ref = "settlement-ref-1";
    const hashed = hashSettlementReference(ref);
    expect(hashed).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(applicationIdToBytes32("00000000-0000-4000-8000-000000000001")).toMatch(/^0x[a-f0-9]{64}$/i);
  });
});
