import { beforeEach, describe, expect, it, vi } from "vitest";

if (!process.env.NEXTAUTH_SECRET?.trim()) {
  process.env.NEXTAUTH_SECRET = "institutional-boundaries-test-secret";
}

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";

const getReceiptById = vi.fn();
const evaluateDecisionReceiptTrust = vi.fn();
const verifyRecordSignature = vi.fn();
const buildNarrowPartnerResultForReceipt = vi.fn();
const consentAllowsPartnerReceipt = vi.fn();

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => getReceiptById(...args),
  consentAllowsPartnerReceipt: (...args: unknown[]) => consentAllowsPartnerReceipt(...args),
}));

vi.mock("@/lib/decisionReceipts/trustEvaluation", () => ({
  evaluateDecisionReceiptTrust: (...args: unknown[]) => evaluateDecisionReceiptTrust(...args),
}));

vi.mock("@/lib/decisionReceipts/views", () => ({
  verifyRecordSignature: (...args: unknown[]) => verifyRecordSignature(...args),
}));

vi.mock("@/lib/partner/narrowPartnerResult/build", () => ({
  buildNarrowPartnerResultForReceipt: (...args: unknown[]) => buildNarrowPartnerResultForReceipt(...args),
}));

vi.mock("@/lib/institutional/securityTelemetry", () => ({
  recordInstitutionalSecuritySignal: vi.fn(async () => "audit_1"),
}));

const baseRecord = {
  id: "rcpt_inst_001",
  partner_id: "institutional-platform",
  policy_id: "institutional-platform-age_21_retail-v1",
  policy_version: 1,
  subject_pseudonym_id: "subj_abc",
  decision_result: "approved",
  decision_context: "sandbox_only",
  consent_receipt_id: "consent_1",
  expires_at: "2099-01-01T00:00:00.000Z",
  verification_decision_id: "vd_1",
};

function happyTrust() {
  return {
    currently_valid: true,
    validity: "active",
    signature_valid: true,
    production_usable: true,
    invalidation_reasons: [],
  };
}

describe("consumeInstitutionalEligibility boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFakeWalletStandardBackend();
    getReceiptById.mockResolvedValue(baseRecord);
    verifyRecordSignature.mockReturnValue(true);
    evaluateDecisionReceiptTrust.mockResolvedValue(happyTrust());
    consentAllowsPartnerReceipt.mockResolvedValue(true);
    buildNarrowPartnerResultForReceipt.mockResolvedValue({ currently_valid: true });
  });

  const baseInput = {
    partnerId: "institutional-platform",
    receiptId: "rcpt_inst_001",
    policyId: baseRecord.policy_id,
    policyVersion: 1,
    replayNonce: "boundary_nonce_valid_12",
    allowSandbox: true,
  };

  it("rejects partner mismatch (cross-tenant)", async () => {
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({ ...baseInput, partnerId: "evil-partner" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("partner_mismatch");
  });

  it("rejects policy and version mismatch", async () => {
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const policy = await consumeInstitutionalEligibility({ ...baseInput, policyId: "wrong-policy" });
    expect(policy.ok).toBe(false);
    const version = await consumeInstitutionalEligibility({ ...baseInput, policyVersion: 99, replayNonce: "boundary_nonce_v2_xx" });
    expect(version.ok).toBe(false);
  });

  it("rejects subject mismatch", async () => {
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({
      ...baseInput,
      subjectPseudonymId: "wrong_subject",
      replayNonce: "boundary_nonce_subj_xx",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("subject_mismatch");
  });

  it("rejects invalid signature path", async () => {
    verifyRecordSignature.mockReturnValue(false);
    evaluateDecisionReceiptTrust.mockResolvedValue({
      ...happyTrust(),
      signature_valid: false,
      currently_valid: false,
      invalidation_reasons: ["signature_invalid"],
    });
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({ ...baseInput, replayNonce: "boundary_nonce_sig_xx" });
    expect(res.ok).toBe(false);
  });

  it("rejects revoked/superseded receipts", async () => {
    evaluateDecisionReceiptTrust.mockResolvedValue({
      currently_valid: false,
      validity: "superseded",
      signature_valid: true,
      production_usable: true,
      invalidation_reasons: ["superseded"],
    });
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({ ...baseInput, replayNonce: "boundary_nonce_rev_xx" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("not_currently_actionable");
  });

  it("requires consent for production context", async () => {
    getReceiptById.mockResolvedValue({ ...baseRecord, decision_context: "production" });
    consentAllowsPartnerReceipt.mockResolvedValue(false);
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({ ...baseInput, allowSandbox: false, replayNonce: "boundary_nonce_consent" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("consent_required");
  });

  it("rejects missing replay nonce at validation layer", async () => {
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({ ...baseInput, replayNonce: "bad" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("invalid_nonce");
  });
});
