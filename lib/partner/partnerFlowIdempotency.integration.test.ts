import { describe, expect, it, vi, beforeEach } from "vitest";
import { issuePartnerSessionReceipt } from "@/lib/partner/relyingPartyFlow";
import { PartnerFlowIdempotencyConflictError } from "@/lib/partner/partnerFlowIdempotency";

const SUBJECT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const PARTNER = "good-trouble-cannabis";
const POLICY = "good-trouble-retail-v1";
const VR = "00000000-0000-4000-8000-0000000000aa";
const CRED_JTI = "cred-jti-1";

const findActiveSessionDecision = vi.fn();
const findDecisionByVerificationRequest = vi.fn();
const findDecisionByIdempotencyKey = vi.fn();
const supersedeActiveSessionDecisions = vi.fn();
const getReceiptByDecisionId = vi.fn();
const evaluatePolicyForSubject = vi.fn();
const issueReceiptForDecision = vi.fn();
const getActiveClaims = vi.fn();
const appendAuditEvent = vi.fn();

vi.mock("@/lib/partner/sessionDecision", () => ({
  findActiveSessionDecision: (...args: unknown[]) => findActiveSessionDecision(...args),
  findDecisionByVerificationRequest: (...args: unknown[]) => findDecisionByVerificationRequest(...args),
  findDecisionByIdempotencyKey: (...args: unknown[]) => findDecisionByIdempotencyKey(...args),
  supersedeActiveSessionDecisions: (...args: unknown[]) => supersedeActiveSessionDecisions(...args),
}));

vi.mock("@/lib/decisionReceipts/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/decisionReceipts/service")>();
  return {
    ...actual,
    getReceiptByDecisionId: (...args: unknown[]) => getReceiptByDecisionId(...args),
    issueReceiptForDecision: (...args: unknown[]) => issueReceiptForDecision(...args),
  };
});

vi.mock("@/lib/policy/evaluateSubjectPolicy", () => ({
  evaluatePolicyForSubject: (...args: unknown[]) => evaluatePolicyForSubject(...args),
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  getActiveClaims: (...args: unknown[]) => getActiveClaims(...args),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (...args: unknown[]) => appendAuditEvent(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: "vd_new" }, error: null }),
        }),
      }),
    }),
  }),
}));

function approvedReceipt(id = "dr_existing") {
  return {
    id,
    verification_decision_id: "vd_existing",
    partner_id: PARTNER,
    policy_id: POLICY,
    policy_version: 1,
    subject_pseudonym_id: "pseudo",
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved" as const,
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production" as const,
    evaluated_at: "2026-07-30T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    revoked_at: null,
    status: "active" as const,
    schema_version: "1.0.0",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: "key",
    anchor_reference: null,
    idempotency_key: "vd_existing",
    created_at: "2026-07-30T00:00:00.000Z",
  };
}

describe("issuePartnerSessionReceipt idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify({
      kty: "OKP",
      crv: "Ed25519",
      x: "test",
    });
    evaluatePolicyForSubject.mockResolvedValue({
      policy: { id: POLICY, version: 1, rules_json: { minimum_age: 21 } },
      evaluation: {
        decision: "approved",
        claims: { identity_verified: true },
        reason_codes: [],
        valid_until: "2099-01-01T00:00:00.000Z",
      },
    });
    getActiveClaims.mockResolvedValue([]);
    getReceiptByDecisionId.mockImplementation(async (decisionId: string) =>
      approvedReceipt(decisionId === "vd_new" ? "dr_new" : "dr_existing"),
    );
  });

  it("returns idempotent replay for complete retries with same verification request", async () => {
    findDecisionByVerificationRequest.mockResolvedValue({
      decision_id: "vd_existing",
      receipt_id: "dr_existing",
      receipt_expires_at: "2099-01-01T00:00:00.000Z",
    });
    findDecisionByIdempotencyKey.mockResolvedValue(null);
    findActiveSessionDecision.mockResolvedValue(null);

    const first = await issuePartnerSessionReceipt({
      suiAddress: SUBJECT,
      partnerId: PARTNER,
      policyId: POLICY,
      credentialJti: CRED_JTI,
      verificationRequestId: VR,
    });

    expect(first.replay_status).toBe("idempotent_replay");
    expect(first.decision_id).toBe("vd_existing");
    expect(first.receipt_id).toBe("dr_existing");
    expect(issueReceiptForDecision).not.toHaveBeenCalled();
    expect(appendAuditEvent).not.toHaveBeenCalled();
  });

  it("returns idempotent replay for active session evaluate retries", async () => {
    findDecisionByVerificationRequest.mockResolvedValue(null);
    findDecisionByIdempotencyKey.mockResolvedValue(null);
    findActiveSessionDecision.mockResolvedValue({
      decision_id: "vd_existing",
      receipt_id: "dr_existing",
      receipt_expires_at: "2099-01-01T00:00:00.000Z",
    });

    const result = await issuePartnerSessionReceipt({
      suiAddress: SUBJECT,
      partnerId: PARTNER,
      policyId: POLICY,
      credentialJti: CRED_JTI,
    });

    expect(result.replay_status).toBe("idempotent_replay");
    expect(issueReceiptForDecision).not.toHaveBeenCalled();
  });

  it("throws idempotency_conflict for mismatched stored identity", async () => {
    findDecisionByVerificationRequest.mockResolvedValue(null);
    findDecisionByIdempotencyKey.mockResolvedValue({
      decision_id: "vd_existing",
      partner_id: PARTNER,
      subject_id: SUBJECT,
      policy_id: POLICY,
      request_id: VR,
      idempotency_key: `pf_vr:${VR}`,
      valid_until: "2099-01-01T00:00:00.000Z",
    });

    await expect(
      issuePartnerSessionReceipt({
        suiAddress: SUBJECT,
        partnerId: "other-partner",
        policyId: POLICY,
        credentialJti: CRED_JTI,
        verificationRequestId: VR,
      }),
    ).rejects.toBeInstanceOf(PartnerFlowIdempotencyConflictError);
  });
});
