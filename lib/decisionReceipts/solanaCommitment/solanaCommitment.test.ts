import { describe, expect, it, vi } from "vitest";
import { buildReceiptCommitmentDigest, RECEIPT_COMMITMENT_DOMAIN } from "@/lib/decisionReceipts/solanaCommitment/digest";
import {
  assertMemoPrivacySafe,
  buildReceiptCommitmentMemo,
  parseReceiptCommitmentMemo,
  serializeReceiptCommitmentMemo,
} from "@/lib/decisionReceipts/solanaCommitment/memo";
import { evaluateSolanaCommitmentTrust } from "@/lib/decisionReceipts/solanaCommitment/trust";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";
import type { SolanaReceiptCommitmentRecord } from "@/lib/decisionReceipts/solanaCommitment/contract";

const PAYLOAD_HASH = "a".repeat(64);

describe("receipt commitment digest", () => {
  it("domain-separates the canonical payload hash", () => {
    const digest = buildReceiptCommitmentDigest(PAYLOAD_HASH);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toBe(PAYLOAD_HASH);
    expect(buildReceiptCommitmentDigest(PAYLOAD_HASH)).toBe(digest);
  });

  it("rejects invalid payload hash", () => {
    expect(() => buildReceiptCommitmentDigest("not-a-hash")).toThrow("invalid_payload_hash");
  });

  it("does not embed domain constants in memo beyond digest", () => {
    const digest = buildReceiptCommitmentDigest(PAYLOAD_HASH);
    const memo = serializeReceiptCommitmentMemo(
      buildReceiptCommitmentMemo({ commitmentDigest: digest }),
    );
    expect(memo).not.toContain(RECEIPT_COMMITMENT_DOMAIN);
    expect(memo).not.toContain(PAYLOAD_HASH);
    expect(memo).not.toContain("dr_");
  });
});

describe("receipt commitment memo privacy", () => {
  it("round-trips compact memo", () => {
    const digest = buildReceiptCommitmentDigest(PAYLOAD_HASH);
    const raw = serializeReceiptCommitmentMemo(
      buildReceiptCommitmentMemo({ commitmentDigest: digest }),
    );
    const parsed = parseReceiptCommitmentMemo(raw);
    expect(parsed?.d).toBe(digest);
    expect(parsed?.v).toBe(2);
    expect(parsed?.rid).toBeUndefined();
  });

  it("still parses legacy v1 memos with receipt id", () => {
    const digest = buildReceiptCommitmentDigest(PAYLOAD_HASH);
    const legacy = JSON.stringify({
      p: "abx-rcpt",
      v: 1,
      d: digest,
      rid: "dr_legacy01",
    });
    const parsed = parseReceiptCommitmentMemo(legacy);
    expect(parsed?.rid).toBe("dr_legacy01");
  });

  it("rejects memos containing forbidden identity tokens", () => {
    expect(() => assertMemoPrivacySafe('{"p":"abx-rcpt","wallet":"leak"}')).toThrow("memo_privacy_violation");
  });
});

describe("solana commitment trust", () => {
  const baseRow = (): SolanaReceiptCommitmentRecord => ({
    id: "id",
    receipt_id: "dr_test",
    cluster: "devnet",
    network_id: "solana_devnet",
    status: "CONFIRMED",
    commitment_digest: buildReceiptCommitmentDigest(PAYLOAD_HASH),
    payload_hash: PAYLOAD_HASH,
    committer_pubkey: "11111111111111111111111111111111",
    memo_payload: "{}",
    transaction_signature: "5".repeat(88).slice(0, 88),
    slot: 1,
    confirmation_status: "confirmed",
    failure_class: null,
    failure_detail: null,
    submission_attempts: 1,
    idempotency_key: "rcpt:dr_test",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    superseded_at: null,
  });

  it("does not require on-chain proof when feature flag is off", () => {
    vi.stubEnv("ABRAXAS_SOLANA_RECEIPT_COMMITMENTS", "");
    const trust = evaluateSolanaCommitmentTrust({
      policyId: GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID,
      commitment: null,
    });
    expect(trust.on_chain_required).toBe(false);
    expect(trust.invalidation_reasons).toEqual([]);
  });

  it("fail-closes when flag on and commitment missing", () => {
    vi.stubEnv("ABRAXAS_SOLANA_RECEIPT_COMMITMENTS", "enabled");
    const trust = evaluateSolanaCommitmentTrust({
      policyId: GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID,
      commitment: null,
    });
    expect(trust.on_chain_required).toBe(true);
    expect(trust.on_chain_confirmed).toBe(false);
    expect(trust.invalidation_reasons).toContain("solana_commitment_missing");
  });

  it("accepts confirmed commitments", () => {
    vi.stubEnv("ABRAXAS_SOLANA_RECEIPT_COMMITMENTS", "enabled");
    const trust = evaluateSolanaCommitmentTrust({
      policyId: GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID,
      commitment: baseRow(),
    });
    expect(trust.on_chain_confirmed).toBe(true);
    expect(trust.invalidation_reasons).toEqual([]);
  });
});
