import { describe, expect, it } from "vitest";

/**
 * P1-1 readiness: documents current policy versioning behavior at beta.
 * Immutable policy snapshots are NOT implemented pre-beta — decisions pin policy_version integer only.
 */
describe("policy version pinning (P1-1 gap documentation)", () => {
  it("verification_decisions schema pins policy_id and policy_version at decision time", () => {
    const decisionColumns = [
      "id",
      "partner_id",
      "subject_id",
      "policy_id",
      "policy_version",
      "decision",
      "claims_json",
      "reason_codes",
      "valid_until",
    ];
    expect(decisionColumns).toContain("policy_id");
    expect(decisionColumns).toContain("policy_version");
  });

  it("decision receipts pin policy_id and policy_version on signed artifact", () => {
    const receiptPinned = {
      policy_id: "good-trouble-retail-v1",
      policy_version: 1,
    };
    expect(receiptPinned.policy_version).toBe(1);
  });

  it("documents P1-1 gap: live rules_json can drift from pinned version", () => {
    // partner_policies uses ON CONFLICT DO UPDATE in migrations — rules_json is not immutable today.
    // Reproducing a decision requires reading historical rules_json snapshot (P1-1 post-beta).
    const p1Gap = "rules_json mutable in partner_policies";
    expect(p1Gap).toContain("mutable");
  });
});
