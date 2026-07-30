import { describe, expect, it } from "vitest";
import { buildTrustDecision } from "@/lib/verify/trustDecision";
import type { PolicyDecisionRecord } from "@/lib/policy/types";

describe("buildTrustDecision", () => {
  const baseDecision: PolicyDecisionRecord = {
    id: "vd_test",
    request_id: null,
    partner_id: "good-trouble-cannabis",
    subject_id: "0xabc",
    policy_id: "good-trouble-retail-v1",
    policy_version: 1,
    decision: "approved",
    claims_json: { identity_verified: true },
    reason_codes: [],
    valid_until: "2026-08-01T00:00:00.000Z",
    decided_at: "2026-07-30T00:00:00.000Z",
    status: "active",
  };

  it("exposes approved boolean and permission from policy", () => {
    const td = buildTrustDecision({ decision: baseDecision });
    expect(td.approved).toBe(true);
    expect(td.permission).toBe("regulated_purchase");
    expect(td.permission_version).toBe("v1");
    expect(td.trust_level).toBe(2);
    expect(td.proof).toBeNull();
  });

  it("nests receipt as proof when provided", () => {
    const td = buildTrustDecision({
      decision: baseDecision,
      receipt: {
        id: "dr_test",
        verification_decision_id: "vd_test",
        consent_receipt_id: null,
        partner_id: "good-trouble-cannabis",
        policy_id: "good-trouble-retail-v1",
        policy_version: 1,
        subject_pseudonym_id: "sub_pseudo",
        wallet_binding_ref: null,
        decision_result: "approved",
        reason_codes: [],
        evaluated_claim_refs: [],
        issuer_refs: [],
        decision_context: "sandbox_only",
        evaluated_at: "2026-07-30T00:00:00.000Z",
        expires_at: "2026-08-01T00:00:00.000Z",
        revoked_at: null,
        status: "active",
        schema_version: "1.0.0",
        payload_hash: "hash",
        signature: "sig",
        signing_key_id: "key1",
        anchor_reference: null,
        idempotency_key: null,
        created_at: "2026-07-30T00:00:00.000Z",
      },
      appUrl: "https://example.com",
    });
    expect(td.proof?.receipt_id).toBe("dr_test");
    expect(td.proof?.verify_url).toContain("/api/receipts/dr_test/public");
  });
});
