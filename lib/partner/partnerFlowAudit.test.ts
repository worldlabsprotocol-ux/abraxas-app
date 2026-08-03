import { describe, expect, it, vi, beforeEach } from "vitest";
import { createFlowTraceId, auditPartnerFlowStep } from "./partnerFlowAudit";

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(async () => "audit-1"),
}));

describe("partnerFlowAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates flow trace ids with ft_ prefix", () => {
    const id = createFlowTraceId();
    expect(id.startsWith("ft_")).toBe(true);
    expect(id.length).toBeGreaterThan(10);
  });

  it("audits partner flow without PII fields", async () => {
    const { appendAuditEvent } = await import("@/lib/verification/audit");
    await auditPartnerFlowStep({
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

    const call = vi.mocked(appendAuditEvent).mock.calls[0]?.[0];
    expect(call?.metadata).not.toHaveProperty("date_of_birth");
    expect(call?.metadata).not.toHaveProperty("document_image");
  });
});
