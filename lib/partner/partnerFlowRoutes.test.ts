import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as evaluatePOST } from "@/app/api/v1/partner-flow/evaluate/route";
import { POST as completePOST } from "@/app/api/v1/partner-flow/complete/route";
import { POST as refreshPOST } from "@/app/api/v1/partner-flow/refresh/route";
import { flowTraceIdFromVerificationRequest } from "@/lib/partner/partnerFlowAudit";

const VR_ID = "00000000-0000-4000-8000-0000000000aa";
const SHARED_TRACE = flowTraceIdFromVerificationRequest(VR_ID);
const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const RETURN_URL = "https://abraxas-app.vercel.app/demo/partner-access";
const PARTNER_ID = "good-trouble-cannabis";
const POLICY_ID = "good-trouble-retail-v1";

const evaluatePartnerFlow = vi.fn();
const completePartnerFlowAfterApproval = vi.fn();
const refreshPartnerSessionReceipt = vi.fn();
const appendAuditEvent = vi.fn(async (_input: unknown) => "audit-1" as string | null);

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(async () => ({
    ok: true,
    session: { suiAddress: SUI },
  })),
}));

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: vi.fn(async () => true),
}));

vi.mock("@/lib/partner/relyingPartyFlow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/relyingPartyFlow")>();
  return {
    ...actual,
    evaluatePartnerFlow: (...args: unknown[]) => evaluatePartnerFlow(...args),
    completePartnerFlowAfterApproval: (...args: unknown[]) => completePartnerFlowAfterApproval(...args),
    refreshPartnerSessionReceipt: (...args: unknown[]) => refreshPartnerSessionReceipt(...args),
  };
});

vi.mock("@/lib/verify/resolveFlowParams", () => ({
  resolvePartnerFlowParams: vi.fn(() => ({ policyId: POLICY_ID })),
}));

vi.mock("@/lib/partner/logPartnerUsage", () => ({
  logPartnerUsage: vi.fn(),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (input: unknown) => appendAuditEvent(input),
}));

function postJson(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function auditTraceIds(): string[] {
  return appendAuditEvent.mock.calls
    .map(call => (call[0] as { metadata?: { flow_trace_id?: string } }).metadata?.flow_trace_id)
    .filter((id): id is string => typeof id === "string");
}

describe("partner-flow routes — shared flow_trace_id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appendAuditEvent.mockResolvedValue("audit-1");
  });

  it("evaluate → complete → refresh share one flow_trace_id in audit events", async () => {
    evaluatePartnerFlow.mockResolvedValue({
      next: "passport",
      verification_request_id: VR_ID,
      passport_url: "https://example.com/passport",
    });

    const evaluateRes = await evaluatePOST(
      postJson("http://localhost/api/v1/partner-flow/evaluate", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
      }),
    );
    const evaluateJson = await evaluateRes.json();
    expect(evaluateRes.status).toBe(200);
    expect(evaluateJson.flow_trace_id).toBe(SHARED_TRACE);

    completePartnerFlowAfterApproval.mockResolvedValue({
      ok: true,
      next: "enter",
      redirect_url: RETURN_URL,
      partner_result: {
        decision: "approved",
        receipt_id: "dr_complete",
        reason_codes: [],
      },
    });

    const completeRes = await completePOST(
      postJson("http://localhost/api/v1/partner-flow/complete", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
        verification_request_id: VR_ID,
      }),
    );
    const completeJson = await completeRes.json();
    expect(completeRes.status).toBe(200);
    expect(completeJson.flow_trace_id).toBe(SHARED_TRACE);

    refreshPartnerSessionReceipt.mockResolvedValue({
      next: "enter",
      redirect_url: RETURN_URL,
      partner_result: {
        decision: "approved",
        receipt_id: "dr_refresh",
        reason_codes: [],
      },
    });

    const refreshRes = await refreshPOST(
      postJson("http://localhost/api/v1/partner-flow/refresh", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
        verification_request_id: VR_ID,
      }),
    );
    const refreshJson = await refreshRes.json();
    expect(refreshRes.status).toBe(200);
    expect(refreshJson.flow_trace_id).toBe(SHARED_TRACE);

    expect(auditTraceIds()).toEqual([
      SHARED_TRACE,
      SHARED_TRACE,
      SHARED_TRACE,
    ]);
    expect(appendAuditEvent.mock.calls.map(c => (c[0] as { action: string }).action)).toEqual([
      "partner_flow.evaluate",
      "partner_flow.complete",
      "partner_flow.refresh",
    ]);
  });

  it("returns 503 when audit persistence fails on successful evaluate", async () => {
    appendAuditEvent.mockResolvedValueOnce(null);
    evaluatePartnerFlow.mockResolvedValue({
      next: "passport",
      verification_request_id: VR_ID,
      passport_url: "https://example.com/passport",
    });

    const res = await evaluatePOST(
      postJson("http://localhost/api/v1/partner-flow/evaluate", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
      }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Audit persistence failed" });
  });

  it("preserves error response when audit fails on evaluate error path", async () => {
    appendAuditEvent.mockResolvedValue(null);
    evaluatePartnerFlow.mockRejectedValue(new Error("evaluation failed"));

    const res = await evaluatePOST(
      postJson("http://localhost/api/v1/partner-flow/evaluate", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("evaluation failed");
    expect(json.flow_trace_id).toMatch(/^ft_/);
  });

  it("rejects mismatching client flow_trace_id on complete — wrong trace not persisted", async () => {
    completePartnerFlowAfterApproval.mockResolvedValue({
      ok: true,
      next: "enter",
      redirect_url: RETURN_URL,
      partner_result: {
        decision: "approved",
        receipt_id: "dr_complete",
        reason_codes: [],
      },
    });

    const maliciousTrace = "ft_client_attacker_trace";
    const res = await completePOST(
      postJson("http://localhost/api/v1/partner-flow/complete", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
        verification_request_id: VR_ID,
        flow_trace_id: maliciousTrace,
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "flow_trace_id does not match verification_request_id",
    });
    expect(appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "partner_flow.rejected",
        metadata: expect.objectContaining({ flow_trace_id: SHARED_TRACE }),
      }),
    );
    expect(auditTraceIds()).not.toContain(maliciousTrace);
  });

  it("rejects mismatching client flow_trace_id on refresh — wrong trace not persisted", async () => {
    refreshPartnerSessionReceipt.mockResolvedValue({
      next: "enter",
      redirect_url: RETURN_URL,
      partner_result: {
        decision: "approved",
        receipt_id: "dr_refresh",
        reason_codes: [],
      },
    });

    const maliciousTrace = "ft_client_attacker_trace";
    const res = await refreshPOST(
      postJson("http://localhost/api/v1/partner-flow/refresh", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
        verification_request_id: VR_ID,
        flow_trace_id: maliciousTrace,
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "flow_trace_id does not match verification_request_id",
    });
    expect(appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "partner_flow.rejected",
        metadata: expect.objectContaining({ flow_trace_id: SHARED_TRACE }),
      }),
    );
    expect(auditTraceIds()).not.toContain(maliciousTrace);
  });
});
