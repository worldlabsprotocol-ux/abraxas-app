/**
 * End-to-end institutional integration scenarios (simulated HTTP + mocked trust plane).
 * Postgres replay concurrency is covered separately in replayRpcPostgres.integration.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

if (!process.env.NEXTAUTH_SECRET?.trim()) {
  process.env.NEXTAUTH_SECRET = "institutional-e2e-test-secret";
}

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import { resetFakeWalletStandardBackend, setFakeWalletAdminMissing } from "@/lib/partner/walletStandard/fakeDurableBackend";

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

const record = {
  id: "rcpt_e2e_001",
  partner_id: "institutional-platform",
  policy_id: "institutional-platform-age_21_retail-v1",
  policy_version: 1,
  subject_pseudonym_id: "subj_e2e",
  decision_result: "approved",
  decision_context: "sandbox_only",
  consent_receipt_id: "consent_1",
  expires_at: "2099-01-01T00:00:00.000Z",
  verification_decision_id: "vd_1",
};

function trustOk() {
  return {
    currently_valid: true,
    validity: "active",
    signature_valid: true,
    production_usable: true,
    invalidation_reasons: [],
  };
}

describe("institutional E2E integration scenarios (simulated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFakeWalletStandardBackend();
    setFakeWalletAdminMissing(false);
    getReceiptById.mockResolvedValue(record);
    verifyRecordSignature.mockReturnValue(true);
    consentAllowsPartnerReceipt.mockResolvedValue(true);
    evaluateDecisionReceiptTrust.mockResolvedValue(trustOk());
    buildNarrowPartnerResultForReceipt.mockResolvedValue({ currently_valid: true });
  });

  const base = {
    partnerId: "institutional-platform",
    receiptId: "rcpt_e2e_001",
    policyId: record.policy_id,
    replayNonce: "e2e_nonce_permit_001",
  };

  it("authorized permit path", async () => {
    const { consumeInstitutionalEligibility } = await import("@/lib/institutional/consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility(base);
    expect(res.ok).toBe(true);
  });

  it("unauthorized partner application (cross-tenant)", async () => {
    const { consumeInstitutionalEligibility } = await import("@/lib/institutional/consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({ ...base, partnerId: "other-partner", replayNonce: "e2e_nonce_tenant_01" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("partner_mismatch");
  });

  it("wrong policy, scope subject", async () => {
    const { consumeInstitutionalEligibility } = await import("@/lib/institutional/consumeInstitutionalEligibility");
    expect((await consumeInstitutionalEligibility({ ...base, policyId: "wrong", replayNonce: "e2e_nonce_pol_001" })).ok).toBe(false);
    expect((await consumeInstitutionalEligibility({
      ...base,
      subjectPseudonymId: "wrong",
      replayNonce: "e2e_nonce_sub_001",
    })).ok).toBe(false);
  });

  it("expired and superseded receipts", async () => {
    evaluateDecisionReceiptTrust.mockResolvedValue({
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      production_usable: true,
      invalidation_reasons: ["receipt_expired"],
    });
    const { consumeInstitutionalEligibility } = await import("@/lib/institutional/consumeInstitutionalEligibility");
    const expired = await consumeInstitutionalEligibility({ ...base, replayNonce: "e2e_nonce_exp_001" });
    expect(expired.ok).toBe(false);
    evaluateDecisionReceiptTrust.mockResolvedValue({
      currently_valid: false,
      validity: "superseded",
      signature_valid: true,
      production_usable: true,
      invalidation_reasons: ["superseded"],
    });
    const superseded = await consumeInstitutionalEligibility({ ...base, replayNonce: "e2e_nonce_sup_001" });
    expect(superseded.ok).toBe(false);
  });

  it("duplicate nonce on permit path", async () => {
    const { consumeInstitutionalEligibility } = await import("@/lib/institutional/consumeInstitutionalEligibility");
    const nonce = "e2e_nonce_dup_permit_1";
    expect((await consumeInstitutionalEligibility({ ...base, replayNonce: nonce })).ok).toBe(true);
    const replay = await consumeInstitutionalEligibility({ ...base, replayNonce: nonce });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.error).toBe("replay_rejected");
  });

  it("store unavailable fail-closed", async () => {
    setFakeWalletAdminMissing(true);
    const { consumeInstitutionalEligibility } = await import("@/lib/institutional/consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({ ...base, replayNonce: "e2e_nonce_store_001" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("replay_store_unavailable");
  });

  it("refresh-required transition retains nonce for retry", async () => {
    evaluateDecisionReceiptTrust.mockResolvedValueOnce({
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      production_usable: true,
      invalidation_reasons: ["receipt_expired"],
    }).mockResolvedValueOnce(trustOk());
    const { consumeInstitutionalEligibility } = await import("@/lib/institutional/consumeInstitutionalEligibility");
    const nonce = "e2e_nonce_refresh_retry";
    expect((await consumeInstitutionalEligibility({ ...base, replayNonce: nonce })).ok).toBe(false);
    expect((await consumeInstitutionalEligibility({ ...base, replayNonce: nonce })).ok).toBe(true);
  });

  it("integration harness contract stages", async () => {
    const { runInstitutionalIntegrationHarness } = await import("@/lib/institutional/integration/institutionalIntegrationHarness");
    const report = await runInstitutionalIntegrationHarness({ includeDurableReplayProof: false });
    expect(report.stages.contract_loaded.ok).toBe(true);
    expect(report.stages.webhook_signature.ok).toBe(true);
    expect(report.stages.consume_request_shape.ok).toBe(true);
    expect(report.all_ok).toBe(true);
  });
});
