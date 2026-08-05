import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as evaluatePOST } from "@/app/api/v1/partner-flow/evaluate/route";
import { POST as completePOST } from "@/app/api/v1/partner-flow/complete/route";
import { flowTraceIdFromVerificationRequest } from "@/lib/partner/partnerFlowAudit";

const VR_ID = "00000000-0000-4000-8000-0000000000aa";
const SHARED_TRACE = flowTraceIdFromVerificationRequest(VR_ID);
const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const RETURN_URL = "https://abraxas-app.vercel.app/demo/partner-access";
const PARTNER_ID = "good-trouble-cannabis";
const POLICY_ID = "good-trouble-retail-v1";

const evaluatePartnerFlow = vi.fn();
const completePartnerFlowAfterApproval = vi.fn();
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

function auditActions(): string[] {
  return appendAuditEvent.mock.calls.map(call => (call[0] as { action: string }).action);
}

describe("partner-flow audit emission order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appendAuditEvent.mockResolvedValue("audit-1");
  });

  it("evaluate enter persists evaluate before receipt_issued", async () => {
    evaluatePartnerFlow.mockResolvedValue({
      next: "enter",
      redirect_url: RETURN_URL,
      decision_id: "vd-enter",
      policy_version: 1,
      replay_status: "issued",
      currently_valid: true,
      validity: "active",
      partner_result: {
        decision: "approved",
        receipt_id: "dr-enter",
        reason_codes: [],
      },
    });

    const res = await evaluatePOST(
      postJson("http://localhost/api/v1/partner-flow/evaluate", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
      }),
    );

    expect(res.status).toBe(200);
    expect(auditActions()).toEqual([
      "partner_flow.evaluate",
      "partner_flow.receipt_issued",
    ]);
    expect((appendAuditEvent.mock.calls[1]?.[0] as { metadata: { issuance_operation: string } }).metadata.issuance_operation)
      .toBe("evaluate");
  });

  it("complete persists receipt_issued before complete", async () => {
    completePartnerFlowAfterApproval.mockResolvedValue({
      ok: true,
      next: "enter",
      redirect_url: RETURN_URL,
      decision_id: "vd-complete",
      policy_version: 1,
      replay_status: "issued",
      currently_valid: true,
      validity: "active",
      partner_result: {
        decision: "approved",
        receipt_id: "dr-complete",
        reason_codes: [],
      },
    });

    const res = await completePOST(
      postJson("http://localhost/api/v1/partner-flow/complete", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
        verification_request_id: VR_ID,
      }),
    );

    expect(res.status).toBe(200);
    expect(auditActions()).toEqual([
      "partner_flow.receipt_issued",
      "partner_flow.complete",
    ]);
    expect((appendAuditEvent.mock.calls[0]?.[0] as { metadata: { issuance_operation: string } }).metadata.issuance_operation)
      .toBe("complete");
    expect((appendAuditEvent.mock.calls[0]?.[0] as { metadata: { flow_trace_id: string } }).metadata.flow_trace_id)
      .toBe(SHARED_TRACE);
  });

  it("complete idempotent replay persists idempotent_replay before complete", async () => {
    completePartnerFlowAfterApproval.mockResolvedValue({
      ok: true,
      next: "enter",
      redirect_url: RETURN_URL,
      decision_id: "vd-complete",
      policy_version: 1,
      replay_status: "idempotent_replay",
      currently_valid: true,
      validity: "active",
      partner_result: {
        decision: "approved",
        receipt_id: "dr-complete",
        reason_codes: [],
      },
    });

    await completePOST(
      postJson("http://localhost/api/v1/partner-flow/complete", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
        verification_request_id: VR_ID,
      }),
    );

    expect(auditActions()).toEqual([
      "partner_flow.idempotent_replay",
      "partner_flow.complete",
    ]);
  });
});
