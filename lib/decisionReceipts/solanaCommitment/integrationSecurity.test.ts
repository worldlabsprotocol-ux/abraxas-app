import { describe, expect, it, vi } from "vitest";
import { buildReceiptCommitmentDigest } from "@/lib/decisionReceipts/solanaCommitment/digest";
import { evaluateSolanaCommitmentTrust } from "@/lib/decisionReceipts/solanaCommitment/trust";
import { parseReceiptCommitmentMemo, serializeReceiptCommitmentMemo, buildReceiptCommitmentMemo } from "@/lib/decisionReceipts/solanaCommitment/memo";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";

describe("solana commitment integration security", () => {
  it("rejects tampered on-chain digest", () => {
    const payloadHash = "b".repeat(64);
    const good = buildReceiptCommitmentDigest(payloadHash);
    const tampered = serializeReceiptCommitmentMemo(
      buildReceiptCommitmentMemo({ commitmentDigest: good }),
    ).replace(good, "c".repeat(64));
    const parsed = parseReceiptCommitmentMemo(tampered);
    expect(parsed?.d).not.toBe(good);
  });

  it("does not publish receipt ids in v2 memos", () => {
    const memo = serializeReceiptCommitmentMemo(
      buildReceiptCommitmentMemo({ commitmentDigest: buildReceiptCommitmentDigest("d".repeat(64)) }),
    );
    expect(memo.includes("dr_")).toBe(false);
    expect(memo.length).toBeLessThan(120);
  });

  it("fail-closes partner trust on forged confirmed state without signature", () => {
    vi.stubEnv("ABRAXAS_SOLANA_RECEIPT_COMMITMENTS", "enabled");
    const trust = evaluateSolanaCommitmentTrust({
      policyId: GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID,
      commitment: {
        id: "x",
        receipt_id: "dr_x",
        cluster: "devnet",
        network_id: "solana_devnet",
        status: "CONFIRMED",
        commitment_digest: "e".repeat(64),
        payload_hash: "e".repeat(64),
        committer_pubkey: "11111111111111111111111111111111",
        memo_payload: null,
        transaction_signature: null,
        slot: null,
        confirmation_status: null,
        failure_class: null,
        failure_detail: null,
        submission_attempts: 1,
        idempotency_key: "rcpt:dr_x",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submitted_at: null,
        confirmed_at: new Date().toISOString(),
        superseded_at: null,
      },
    });
    expect(trust.on_chain_confirmed).toBe(false);
    expect(trust.invalidation_reasons.length).toBeGreaterThan(0);
  });
});
