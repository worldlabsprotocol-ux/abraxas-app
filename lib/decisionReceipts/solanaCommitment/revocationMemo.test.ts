import { describe, expect, it } from "vitest";
import {
  buildRevocationMemo,
  parseRevocationMemo,
  serializeRevocationMemo,
  verifyRevocationMemoFields,
} from "@/lib/decisionReceipts/solanaCommitment/revocationMemo";

describe("revocation memo (abx-rvkt)", () => {
  const digest = "a".repeat(64);
  const policy = "b".repeat(64);

  it("round-trips privacy-safe memo", () => {
    const memo = buildRevocationMemo({
      targetCommitmentDigest: digest,
      action: "revoke",
      sequence: 1,
      policyCommitmentHash: policy,
    });
    const raw = serializeRevocationMemo(memo);
    const parsed = parseRevocationMemo(raw);
    expect(parsed).not.toBeNull();
    expect(verifyRevocationMemoFields(parsed!, { targetCommitmentDigest: digest, policyCommitmentHash: policy })).toBe(true);
  });

  it("rejects tampered event digest", () => {
    const memo = buildRevocationMemo({
      targetCommitmentDigest: digest,
      action: "supersede",
      sequence: 2,
      policyCommitmentHash: policy,
    });
    const tampered = { ...memo, e: "c".repeat(64) };
    expect(verifyRevocationMemoFields(tampered, { targetCommitmentDigest: digest, policyCommitmentHash: policy })).toBe(false);
  });
});
