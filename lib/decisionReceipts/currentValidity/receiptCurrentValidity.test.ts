import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluateReceiptCurrentValidity } from "./evaluate";
import {
  isReceiptSuperseded,
  putReceiptSupersessionForTests,
  resetReceiptSupersessionsForTests,
} from "@/lib/decisionReceipts/receiptSupersession";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { outcomeFromValidationErrors } from "@/lib/partner/integrationKit/outcomes";
import { evaluateFactCompatibility } from "@/lib/passport/reusableEligibility/compatibility";
import { projectInternalFact, type SourceReceiptRow } from "@/lib/passport/reusableEligibility/facts";
import { integrationObservabilityLeaks } from "@/lib/partner/integrationObservability/sanitize";

const TEST_KEY = generateTestSigningKeyPair();

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({
    from: fromMock,
    rpc: (...args: unknown[]) => rpcMock(...args),
  })),
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicyAtVersion: vi.fn(async () => ({
    id: "partner-policy-v1",
    partner_id: "partner-a",
    version: 1,
    name: "Policy",
    rules_json: {},
    status: "active",
    deprecate_effective_at: null,
  })),
}));

vi.mock("@/lib/decisionReceipts/dependencies", () => ({
  getReceiptDependencies: vi.fn(async () => []),
}));

vi.mock("@/lib/decisionReceipts/evidenceDependencies", () => ({
  getReceiptEvidenceDependencies: vi.fn(async () => []),
}));

vi.mock("@/lib/passport/reusableEligibility/invalidation", () => ({
  loadSourceReceiptRow: vi.fn(async () => null),
  getDerivationByDerivedReceipt: vi.fn(async () => null),
}));

vi.mock("@/lib/trust/credentialStatusRegistry", () => ({
  getClaimById: vi.fn(async (id: string) => ({
    id,
    status: "active",
    expires_at: null,
    assurance_level: "L2",
    jurisdiction: "US",
    issued_at: "2026-01-01T00:00:00.000Z",
  })),
  resolveClaimStatusAtRead: vi.fn(({ status }: { status: string }) => status),
}));

vi.mock("@/lib/trust/issuerFramework", () => ({
  getIssuerById: vi.fn(async () => ({ issuer_status: "active" })),
  getIssuerSigningKey: vi.fn(async () => ({ status: "active" })),
  isIssuerTrustedForClaim: vi.fn(async () => ({ ok: true, reason: "trusted" })),
}));

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_lifecycle_1",
    decision_id: "00000000-0000-4000-8000-000000009901",
    policy_id: "partner-a-age_21_retail-v1",
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
    schema_version: "1.0.0",
    payload_hash: payloadHash,
    signature,
    signing_key_id: TEST_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

function mockStores() {
  fromMock.mockImplementation((table: string) => {
    if (table === "partners") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { status: "active" }, error: null }),
      };
    }
    if (table === "credential_claims") {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ id: "claim-1", status: "active", expires_at: null }],
          error: null,
        }),
      };
    }
    if (table === "receipt_claim_dependencies") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

describe("receipt current validity", () => {
  beforeEach(() => {
    resetReceiptSupersessionsForTests();
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
    mockStores();
  });

  it("distinguishes issued_valid from currently_valid for revoked receipts", async () => {
    const record = sampleRecord({ status: "revoked", revoked_at: "2026-09-01T00:00:00.000Z" });
    const result = await evaluateReceiptCurrentValidity({ record });
    expect(result.issued_valid).toBe(true);
    expect(result.currently_valid).toBe(false);
    expect(result.lifecycle_status).toBe("revoked");
    expect(result.partner_safe_reason).toBe("receipt_revoked");
  });

  it("fails closed when a receipt is superseded in scope", async () => {
    const record = sampleRecord();
    putReceiptSupersessionForTests({
      supersededReceiptId: record.id,
      supersedingReceiptId: "dr_new",
      partnerId: record.partner_id,
      policyId: record.policy_id,
      policyVersion: record.policy_version,
    });
    const superseded = await isReceiptSuperseded(record.id);
    expect(superseded.superseded).toBe(true);

    const result = await evaluateReceiptCurrentValidity({ record });
    expect(result.currently_valid).toBe(false);
    expect(result.lifecycle_status).toBe("superseded");
    expect(result.partner_safe_reason).toBe("receipt_superseded");
  });

  it("denies verifyForAction when public receipt reports superseded lifecycle", () => {
    const validation = validatePartnerFlowPublicReceipt({
      receipt_id: "dr_lifecycle_1",
      schema_version: "1.0.0",
      partner_id: "partner-a",
      policy_id: "partner-a-age_21_retail-v1",
      policy_version: 1,
      decision_result: "approved",
      signature_valid: true,
      expires_at: "2099-01-01T00:00:00.000Z",
      status: "active",
      production_usable: true,
      decision_context: "production",
      artifact_type: "eligibility_decision_receipt",
      currently_valid: false,
      lifecycle_status: "superseded",
      partner_safe_reason: "receipt_superseded",
      invalidation_reasons: ["receipt_superseded"],
    }, {
      partnerId: "partner-a",
      policyId: "partner-a-age_21_retail-v1",
      mode: "production",
    });
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("receipt_superseded");
    expect(outcomeFromValidationErrors(validation.errors)).toBe("superseded");
  });

  it("rejects stale reusable evidence without exposing raw fact content", () => {
    const source = receipt({ expires_at: "2020-01-01T00:00:00.000Z", status: "active" });
    const fact = projectInternalFact({ subjectId: "0x" + "a".repeat(64), receipt: source });
    if (!fact) throw new Error("fact_missing");
    const check = evaluateFactCompatibility({
      fact,
      targetPolicyId: "partner-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetSandboxOnly: false,
      now: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("expired");
    expect(JSON.stringify(check)).not.toMatch(/date_of_birth|legal_name|passport/i);
  });

  it("does not leak PII in canonical validity results", async () => {
    const record = sampleRecord();
    const result = await evaluateReceiptCurrentValidity({ record });
    expect(integrationObservabilityLeaks(result).length).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/date_of_birth|legal_name|0x[a-f0-9]{40}/i);
  });
});

function receipt(overrides: Partial<SourceReceiptRow> = {}): SourceReceiptRow {
  return {
    id: "dr_source",
    verification_decision_id: "00000000-0000-4000-8000-0000000000aa",
    partner_id: "partner-a",
    policy_id: "partner-age_21_retail-v1",
    policy_version: 1,
    subject_pseudonym_id: subjectPseudonymId("0xabc"),
    decision_result: "approved",
    decision_context: "production",
    evaluated_at: "2026-09-01T00:00:00.000Z",
    expires_at: "2026-12-01T00:00:00.000Z",
    revoked_at: null,
    status: "active",
    ...overrides,
  };
}
