import { describe, expect, it, vi, beforeEach } from "vitest";

const appendAuditEvent = vi.hoisted(() =>
  vi.fn(async (_input: unknown) => "audit-1" as string | null),
);

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (input: unknown) => appendAuditEvent(input),
}));

import {
  createFlowTraceId,
  flowTraceIdFromVerificationRequest,
  resolvePartnerFlowTraceId,
  auditPartnerFlowStepRequired,
  auditPartnerFlowStepBestEffort,
  PartnerFlowAuditPersistenceError,
} from "./partnerFlowAudit";

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

  it("audits partner flow without PII fields", async () => {
    await auditPartnerFlowStepRequired({
      flowTraceId: "ft_test",
      action: "partner_flow.evaluate",
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
      subjectId: "0xabc",
      outcome: "enter",
      decisionId: "vd-1",
      receiptId: "dr_test",
      verificationRequestId: "req-1",
      reasonCodes: [],
    });

    expect(appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "partner_flow.evaluate",
        policy_id: "good-trouble-retail-v1",
        metadata: expect.objectContaining({
          flow_trace_id: "ft_test",
          partner_id: "good-trouble-cannabis",
          outcome: "enter",
          decision_id: "vd-1",
          receipt_id: "dr_test",
          verification_request_id: "req-1",
        }),
      }),
    );

    const call = appendAuditEvent.mock.calls[0]?.[0] as { metadata?: Record<string, unknown> };
    expect(call?.metadata).not.toHaveProperty("date_of_birth");
    expect(call?.metadata).not.toHaveProperty("document_image");
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

  it("auditPartnerFlowStepRequired returns audit id on success", async () => {
    const id = await auditPartnerFlowStepRequired({
      flowTraceId: "ft_ok",
      action: "partner_flow.complete",
      partnerId: "p",
      policyId: "pol",
      subjectId: "sub",
      outcome: "enter",
    });
    expect(id).toBe("audit-1");
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

  it("auditPartnerFlowStepBestEffort does not throw when appendAuditEvent throws", async () => {
    appendAuditEvent.mockRejectedValueOnce(new Error("db down"));
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
