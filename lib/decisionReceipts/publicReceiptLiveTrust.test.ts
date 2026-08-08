import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  applyLiveClaimStatusesToRefs,
  attachLiveTrustToPublicView,
  buildPublicReceiptWithLiveTrust,
} from "@/lib/decisionReceipts/publicReceiptLiveTrust";
import { toPublicView } from "@/lib/decisionReceipts/views";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  revokeDecisionReceiptControlled,
  revokeSubjectPartnerAccess,
} from "@/lib/decisionReceipts/revocationControlPlane";

const TEST_KEY = generateTestSigningKeyPair();

const rpcMock = vi.fn();
const fromMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({
    from: fromMock,
    rpc: (...args: unknown[]) => rpcMock(...args),
  })),
  getSupabaseAdmin: vi.fn(() => ({
    from: fromMock,
    rpc: (...args: unknown[]) => rpcMock(...args),
  })),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn().mockResolvedValue("audit-1"),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: vi.fn(),
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  getActiveClaims: vi.fn().mockResolvedValue([]),
}));

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_public_contract",
    decision_id: "00000000-0000-4000-8000-000000009901",
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

function mockClaimStatusLookup(statusByClaimId: Record<string, string>) {
  fromMock.mockImplementation((table: string) => {
    if (table === "credential_claims") {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: Object.entries(statusByClaimId).map(([id, status]) => ({ id, status, expires_at: null })),
          error: null,
        }),
      };
    }
    if (table === "decision_receipts") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    if (table === "receipt_claim_dependencies") {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

describe("public receipt live trust contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
    rpcMock.mockReset();
  });

  it("issues valid receipt that validates from public response only", async () => {
    const record = sampleRecord();
    mockClaimStatusLookup({ "claim-1": "active" });

    const publicView = await buildPublicReceiptWithLiveTrust(record);
    const partnerValidation = validatePartnerFlowPublicReceipt(publicView, {
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(publicView.signature_valid).toBe(true);
    expect(publicView.currently_valid).toBe(true);
    expect(publicView.invalidation_reasons).toEqual([]);
    expect(partnerValidation.ok).toBe(true);
    expect(JSON.stringify(publicView)).not.toContain("reviewer");
    expect(JSON.stringify(publicView)).not.toContain("@");
  });

  it("after linked claim revoke, public response is currently invalid and partner rejects synchronously", async () => {
    const record = sampleRecord();
    mockClaimStatusLookup({ "claim-1": "revoked" });

    const baseView = toPublicView(record);
    const enrichedRefs = applyLiveClaimStatusesToRefs(baseView.evaluated_claim_refs, new Map([["claim-1", "revoked"]]));
    const trust = evaluatePublicReceiptTrust({
      ...baseView,
      evaluated_claim_refs: enrichedRefs,
    }, {
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const publicView = attachLiveTrustToPublicView({ ...baseView, evaluated_claim_refs: enrichedRefs }, trust);
    const partnerValidation = validatePartnerFlowPublicReceipt(publicView, {
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(publicView.signature_valid).toBe(true);
    expect(publicView.currently_valid).toBe(false);
    expect(publicView.invalidation_reasons).toContain("claim_revoked");
    expect(publicView.validity).toBe("access_revoked");
    expect(partnerValidation.ok).toBe(false);
    expect(partnerValidation.errors).toContain("claim_revoked");
  });

  it("receipt-only revoke still invalidates public response with receipt_revoked", () => {
    const record = sampleRecord({
      status: "revoked",
      revoked_at: "2026-06-02T00:00:00.000Z",
    });
    const baseView = toPublicView(record);
    const trust = evaluatePublicReceiptTrust(baseView, {
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const publicView = attachLiveTrustToPublicView(baseView, trust);
    const partnerValidation = validatePartnerFlowPublicReceipt(publicView, {
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(publicView.currently_valid).toBe(false);
    expect(publicView.invalidation_reasons).toContain("receipt_revoked");
    expect(partnerValidation.ok).toBe(false);
  });
});

describe("revocation atomic rpc + partner scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockReset();
  });

  it("uses atomic rpc for receipt revoke and duplicate revoke is idempotent", async () => {
    const { getReceiptById } = await import("@/lib/decisionReceipts/service");
    vi.mocked(getReceiptById).mockResolvedValue(sampleRecord());

    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        receipt_id: "dr_public_contract",
        decision_id: "00000000-0000-4000-8000-000000009901",
        revoked_at: "2026-06-02T00:00:00.000Z",
        reason_code: "operator_security_review",
        already_revoked: false,
        claim_ids: ["claim-1"],
      },
      error: null,
    });

    const first = await revokeDecisionReceiptControlled({
      receiptId: "dr_public_contract",
      reasonCode: "operator_security_review",
      changedBy: "admin_pin",
      idempotencyKey: "revoke:once",
    });
    expect(first.ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("revoke_decision_receipt_atomic", expect.any(Object));

    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        receipt_id: "dr_public_contract",
        decision_id: "00000000-0000-4000-8000-000000009901",
        revoked_at: "2026-06-02T00:00:00.000Z",
        reason_code: "operator_security_review",
        already_revoked: true,
        claim_ids: ["claim-1"],
      },
      error: null,
    });

    const second = await revokeDecisionReceiptControlled({
      receiptId: "dr_public_contract",
      reasonCode: "operator_security_review",
      changedBy: "admin_pin",
      idempotencyKey: "revoke:once",
    });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.alreadyRevoked).toBe(true);
  });

  it("subject_access revokes only scoped partner receipts", async () => {
    const { getReceiptById } = await import("@/lib/decisionReceipts/service");
    vi.mocked(getReceiptById)
      .mockResolvedValueOnce(sampleRecord({ id: "dr_partner_a", partner_id: "partner-a" }))
      .mockResolvedValueOnce(sampleRecord({ id: "dr_partner_b", partner_id: "partner-b" }));

    fromMock.mockImplementation((table: string) => {
      if (table === "decision_receipts") {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{
              id: "dr_partner_a",
              verification_decision_id: "dec-a",
              partner_id: "partner-a",
              policy_id: "partner-policy-v1",
              status: "active",
              revoked_at: null,
              revocation_reason_code: null,
            }],
            error: null,
          }),
        };
        return chain;
      }
      if (table === "receipt_claim_dependencies") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        receipt_id: "dr_partner_a",
        decision_id: "dec-a",
        revoked_at: "2026-06-02T00:00:00.000Z",
        reason_code: "operator_security_review",
        already_revoked: false,
        claim_ids: [],
      },
      error: null,
    });

    const result = await revokeSubjectPartnerAccess({
      subjectId: "0xabc",
      partnerId: "partner-a",
      reasonCode: "operator_security_review",
      changedBy: "admin_pin",
      idempotencyKey: "scope:partner-a",
    });

    expect(result.revokedReceiptIds).toEqual(["dr_partner_a"]);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("revoke_decision_receipt_atomic", expect.objectContaining({
      p_receipt_id: "dr_partner_a",
    }));
    expect(rpcMock).not.toHaveBeenCalledWith("revoke_decision_receipt_atomic", expect.objectContaining({
      p_receipt_id: "dr_partner_b",
    }));
  });
});
