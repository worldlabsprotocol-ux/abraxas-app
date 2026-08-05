import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createFlowTraceId,
  flowTraceIdFromVerificationRequest,
  resolvePartnerFlowTraceId,
  rejectMismatchedClientFlowTrace,
  FlowTraceMismatchError,
  auditPartnerFlowStepRequired,
  auditPartnerFlowStepBestEffort,
  auditPartnerFlowIdempotentReplay,
  auditPartnerFlowReceiptIssued,
  PartnerFlowAuditPersistenceError,
} from "./partnerFlowAudit";
import { PARTNER_FLOW_AUDIT_METADATA_KEYS } from "./partnerFlowAuditContract";

const appendAuditEvent = vi.hoisted(() =>
  vi.fn(async (_input: unknown) => "audit-1" as string | null),
);

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (input: unknown) => appendAuditEvent(input),
}));

describe("partnerFlowAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appendAuditEvent.mockResolvedValue("audit-1");
  });

  it("creates flow trace ids with ft_ prefix", () => {
    const id = createFlowTraceId();
    expect(id.startsWith("ft_")).toBe(true);
    expect(id.length).toBeGreaterThan(10);
  });

  it("derives durable trace id from verification request id", () => {
    const vrId = "00000000-0000-4000-8000-000000000001";
    expect(flowTraceIdFromVerificationRequest(vrId)).toBe(`ft_vr_${vrId}`);
    expect(resolvePartnerFlowTraceId({ verificationRequestId: vrId })).toBe(`ft_vr_${vrId}`);
  });

  it("prefers verification request over receipt when resolving trace id", () => {
    const vrId = "vr-priority";
    expect(resolvePartnerFlowTraceId({
      verificationRequestId: vrId,
      receiptId: "dr_other",
    })).toBe(`ft_vr_${vrId}`);
  });

  it("rejectMismatchedClientFlowTrace throws when client trace disagrees", () => {
    expect(() =>
      rejectMismatchedClientFlowTrace("ft_client_fake", "ft_vr_real"),
    ).toThrow(FlowTraceMismatchError);
  });

  it("rejectMismatchedClientFlowTrace ignores absent client trace", () => {
    expect(() =>
      rejectMismatchedClientFlowTrace(undefined, "ft_vr_real"),
    ).not.toThrow();
  });

  it("audits partner flow with contract metadata and no PII fields", async () => {
    await auditPartnerFlowStepRequired({
      flowTraceId: "ft_test",
      action: "partner_flow.evaluate",
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
      policyVersion: 1,
      subjectId: "0xabc",
      outcome: "enter",
      decisionId: "vd-1",
      receiptId: "dr_test",
      verificationRequestId: "req-1",
      reasonCodes: [],
      validity: "active",
      currentlyValid: true,
      replayStatus: "issued",
      idempotencyKey: "pf_vr:req-1",
      error: "holder@example.com",
    });

    const call = appendAuditEvent.mock.calls[0]?.[0] as {
      actor_type: string;
      actor_id: string;
      metadata?: Record<string, unknown>;
    };
    expect(call.actor_type).toBe("system");
    expect(call.actor_id).toBe("partner_flow");
    for (const key of PARTNER_FLOW_AUDIT_METADATA_KEYS) {
      expect(call.metadata).toHaveProperty(key);
    }
    expect(call.metadata?.error).toBe("generic_error");
    expect(call.metadata).not.toHaveProperty("date_of_birth");
    expect(call.metadata).not.toHaveProperty("credential_jti");
    expect(call.metadata).not.toHaveProperty("subject_id");
  });

  it("auditPartnerFlowStepRequired throws when persistence returns null", async () => {
    appendAuditEvent.mockResolvedValueOnce(null);
    await expect(
      auditPartnerFlowStepRequired({
        flowTraceId: "ft_fail",
        action: "partner_flow.evaluate",
        partnerId: "p",
        policyId: "pol",
        subjectId: "sub",
        outcome: "enter",
      }),
    ).rejects.toBeInstanceOf(PartnerFlowAuditPersistenceError);
  });

  it("auditPartnerFlowReceiptIssued uses distinct action", async () => {
    await auditPartnerFlowReceiptIssued({
      flowTraceId: "ft_rc",
      partnerId: "p",
      policyId: "pol",
      subjectId: "sub",
      outcome: "issued",
      receiptId: "dr-1",
      issuanceOperation: "evaluate",
    });
    expect(appendAuditEvent.mock.calls[0]?.[0]).toMatchObject({
      action: "partner_flow.receipt_issued",
      metadata: expect.objectContaining({
        issuance_operation: "evaluate",
        receipt_id: "dr-1",
      }),
    });
  });

  it("auditPartnerFlowIdempotentReplay uses distinct replay action", async () => {
    await auditPartnerFlowIdempotentReplay({
      flowTraceId: "ft_vr",
      partnerId: "p",
      policyId: "pol",
      subjectId: "sub",
      outcome: "idempotent_replay",
      receiptId: "dr-1",
    });
    expect(appendAuditEvent.mock.calls[0]?.[0]).toMatchObject({
      action: "partner_flow.idempotent_replay",
      metadata: expect.objectContaining({ replay_status: "idempotent_replay" }),
    });
  });

  it("auditPartnerFlowStepBestEffort does not throw when persistence fails", async () => {
    appendAuditEvent.mockResolvedValueOnce(null);
    await expect(
      auditPartnerFlowStepBestEffort({
        flowTraceId: "ft_err",
        action: "partner_flow.evaluate",
        partnerId: "p",
        policyId: "pol",
        subjectId: "sub",
        outcome: "error",
        error: "boom",
      }),
    ).resolves.toBeUndefined();
  });
});
