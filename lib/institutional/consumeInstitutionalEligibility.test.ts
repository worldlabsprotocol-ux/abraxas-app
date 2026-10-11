import { describe, expect, it, vi, beforeEach } from "vitest";
import { resetInstitutionalReplayGuardForTests } from "@/lib/institutional/replayGuard";

const getReceiptById = vi.fn();
const evaluateDecisionReceiptTrust = vi.fn();
const verifyRecordSignature = vi.fn();
const buildNarrowPartnerResultForReceipt = vi.fn();

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => getReceiptById(...args),
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
  decision_result: "approved",
  expires_at: "2099-01-01T00:00:00.000Z",
  verification_decision_id: "vd_1",
};

describe("consumeInstitutionalEligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetInstitutionalReplayGuardForTests();
    getReceiptById.mockResolvedValue(baseRecord);
    verifyRecordSignature.mockReturnValue(true);
    evaluateDecisionReceiptTrust.mockResolvedValue({
      currently_valid: true,
      validity: "active",
      signature_valid: true,
      production_usable: true,
      invalidation_reasons: [],
    });
    buildNarrowPartnerResultForReceipt.mockResolvedValue({
      schema_version: "1.0.0",
      receipt_id: "rcpt_inst_001",
      partner_id: "institutional-platform",
      policy_id: baseRecord.policy_id,
      decision: "approved",
      result_family: "age_eligible_21",
      currently_valid: true,
      production_usable: true,
      trust_environment: "production",
      invalidation_reasons: [],
    });
  });

  it("permits when trust is currently valid", async () => {
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({
      partnerId: "institutional-platform",
      receiptId: "rcpt_inst_001",
      policyId: baseRecord.policy_id,
      policyVersion: 1,
      correlationId: "corr_test",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.decision.outcome).toBe("permit");
      expect(res.decision.currently_actionable).toBe(true);
      expect(res.decision.signature_authentic).toBe(true);
    }
  });

  it("denies when signature invalid", async () => {
    verifyRecordSignature.mockReturnValue(false);
    evaluateDecisionReceiptTrust.mockResolvedValue({
      currently_valid: false,
      validity: "signature_invalid",
      signature_valid: false,
      production_usable: false,
      invalidation_reasons: ["signature_invalid"],
    });
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({
      partnerId: "institutional-platform",
      receiptId: "rcpt_inst_001",
      policyId: baseRecord.policy_id,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("not_currently_actionable");
  });

  it("rejects replay nonce reuse", async () => {
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const input = {
      partnerId: "institutional-platform",
      receiptId: "rcpt_inst_001",
      policyId: baseRecord.policy_id,
      replayNonce: "nonce_once",
    };
    expect((await consumeInstitutionalEligibility(input)).ok).toBe(true);
    const replay = await consumeInstitutionalEligibility(input);
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.error).toBe("replay_rejected");
  });

  it("maps expired receipts to refresh_required", async () => {
    evaluateDecisionReceiptTrust.mockResolvedValue({
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      production_usable: true,
      invalidation_reasons: ["receipt_expired"],
    });
    const { consumeInstitutionalEligibility } = await import("./consumeInstitutionalEligibility");
    const res = await consumeInstitutionalEligibility({
      partnerId: "institutional-platform",
      receiptId: "rcpt_inst_001",
      policyId: baseRecord.policy_id,
    });
    expect(res.ok).toBe(false);
    if (!res.ok && res.decision) {
      expect(res.decision.outcome).toBe("refresh_required");
      expect(res.decision.signature_authentic).toBe(true);
      expect(res.decision.currently_actionable).toBe(false);
    }
  });
});
