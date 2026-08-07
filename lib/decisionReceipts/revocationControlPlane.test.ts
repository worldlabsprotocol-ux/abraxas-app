import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  evaluatePublicReceiptTrust,
} from "@/lib/decisionReceipts/trustEvaluation";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { toPublicView } from "@/lib/decisionReceipts/views";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  isRevocationReasonCode,
  revokeDecisionReceiptControlled,
  revocationAuditMetadataHasNoPii,
} from "@/lib/decisionReceipts/revocationControlPlane";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

const TEST_KEY = generateTestSigningKeyPair();

const insertMock = vi.fn();
const updateMock = vi.fn().mockReturnThis();
const eqMock = vi.fn().mockReturnThis();
const selectMock = vi.fn().mockReturnThis();
const maybeSingleMock = vi.fn();
const fromMock = vi.fn(() => ({
  insert: insertMock,
  update: updateMock,
  select: selectMock,
  eq: eqMock,
  maybeSingle: maybeSingleMock,
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
  getSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn().mockResolvedValue("audit-1"),
}));

vi.mock("@/lib/decisionReceipts/dependencies", () => ({
  getReceiptDependencies: vi.fn().mockResolvedValue([
    { claim_id: "claim-1", claim_type: "identity_verified", issuer_id: "issuer:abraxas" },
  ]),
}));

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_revoke_test",
    decision_id: "00000000-0000-4000-8000-000000000099",
    policy_id: "partner-policy-v1",
    policy_version: 1,
    partner_id: "partner-a",
    subject_pseudonym_id: subjectPseudonymId("0xabc"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["all_claims_met"],
    evaluated_claim_refs: [{
      claim_id: "claim-1",
      claim_type: "identity_verified",
      issuer_id: "issuer:abraxas",
      status: "active",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
    }],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: null,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: "production",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: TEST_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: vi.fn(),
}));

describe("revocation control plane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
    insertMock.mockResolvedValue({ error: null });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
  });

  it("accepts only fixed non-pii reason codes", () => {
    expect(isRevocationReasonCode("operator_security_review")).toBe(true);
    expect(isRevocationReasonCode("custom_reason")).toBe(false);
  });

  it("active receipt validates before revocation", () => {
    const record = sampleRecord();
    const publicView = toPublicView(record);
    const trust = evaluatePublicReceiptTrust(publicView, {
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const partnerValidation = validatePartnerFlowPublicReceipt(publicView, {
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(trust.currently_valid).toBe(true);
    expect(partnerValidation.ok).toBe(true);
  });

  it("revoked receipt is rejected by public receipt and partner verifier", () => {
    const record = sampleRecord({
      status: "revoked",
      revoked_at: "2026-06-02T00:00:00.000Z",
    });
    const publicView = toPublicView(record);
    const trust = evaluatePublicReceiptTrust(publicView, {
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const partnerValidation = validatePartnerFlowPublicReceipt(publicView, {
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(publicView.status).toBe("revoked");
    expect(trust.currently_valid).toBe(false);
    expect(trust.invalidation_reasons).toContain("receipt_revoked");
    expect(partnerValidation.ok).toBe(false);
    expect(partnerValidation.errors).toContain("receipt_revoked");
    expect(JSON.stringify(publicView)).not.toContain("@");
    expect(JSON.stringify(publicView)).not.toContain("reviewer");
  });

  it("revokes an active receipt and writes immutable event + audit metadata", async () => {
    const { getReceiptById } = await import("@/lib/decisionReceipts/service");
    vi.mocked(getReceiptById).mockResolvedValue(sampleRecord());
    maybeSingleMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: sampleRecord(), error: null });

    const result = await revokeDecisionReceiptControlled({
      receiptId: "dr_revoke_test",
      reasonCode: "operator_security_review",
      changedBy: "admin_pin",
      idempotencyKey: "revoke:dr_revoke_test",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alreadyRevoked).toBe(false);
    expect(result.reasonCode).toBe("operator_security_review");
    expect(updateMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      receipt_id: "dr_revoke_test",
      reason_code: "operator_security_review",
      changed_by: "admin_pin",
      idempotency_key: "revoke:dr_revoke_test",
    }));
  });

  it("duplicate revoke is idempotent", async () => {
    const { getReceiptById } = await import("@/lib/decisionReceipts/service");
    const revoked = sampleRecord({
      status: "revoked",
      revoked_at: "2026-06-02T00:00:00.000Z",
    });
    vi.mocked(getReceiptById).mockResolvedValue(revoked);
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        receipt_id: "dr_revoke_test",
        verification_decision_id: revoked.verification_decision_id,
        reason_code: "operator_security_review",
        created_at: revoked.revoked_at,
        claim_ids: ["claim-1"],
      },
      error: null,
    });

    const byKey = await revokeDecisionReceiptControlled({
      receiptId: "dr_revoke_test",
      reasonCode: "operator_security_review",
      changedBy: "admin_pin",
      idempotencyKey: "revoke:dr_revoke_test",
    });
    expect(byKey.ok).toBe(true);
    if (byKey.ok) expect(byKey.alreadyRevoked).toBe(true);

    vi.mocked(getReceiptById).mockResolvedValue(revoked);
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    const second = await revokeDecisionReceiptControlled({
      receiptId: "dr_revoke_test",
      reasonCode: "operator_security_review",
      changedBy: "admin_pin",
    });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.alreadyRevoked).toBe(true);
  });

  it("audit metadata contains no pii or reviewer notes", () => {
    const metadata = {
      reason_code: "operator_security_review",
      verification_decision_id: "00000000-0000-4000-8000-000000000099",
      claim_ids: ["claim-1"],
      partner_id: "partner-a",
    };
    expect(revocationAuditMetadataHasNoPii(metadata)).toBe(true);
    expect(JSON.stringify(metadata)).not.toContain("reviewer");
    expect(JSON.stringify(metadata)).not.toContain("@");
  });
});
