import { describe, expect, it } from "vitest";
import { fetchCommitmentChainEvidenceFromRpc } from "./fetchChainEvidence";

describe("fetchCommitmentChainEvidenceFromRpc", () => {
  it("requires a transaction signature", async () => {
    const result = await fetchCommitmentChainEvidenceFromRpc({
      rpcUrl: "http://127.0.0.1:8899",
      registryAdmin: "11111111111111111111111111111112",
      receiptId: "dr_test",
      transactionSignature: "",
      executionExpectations: {
        holder: "11111111111111111111111111111112",
        commitment: "11111111111111111111111111111112",
        receiptIdHash: Buffer.alloc(32),
        payloadHash: Buffer.alloc(32),
        executionNonce: BigInt(1),
        expiresAt: BigInt(9_000_000_000),
        statusVersion: BigInt(1),
        commitmentMessage: Buffer.alloc(32),
      },
    });
    expect(result).toEqual({ ok: false, reason: "chain_transaction_signature_required" });
  });
});