import { describe, expect, it } from "vitest";
import { analyzePartnerFlowTrace } from "@/lib/partner/partnerFlowTraceAudit";

const TRACE = "ft_vr_00000000-0000-4000-8000-0000000000aa";

function event(
  action: string,
  metadata: Record<string, unknown>,
  created_at: string,
) {
  return {
    id: `${action}-${created_at}`,
    action,
    object_type: "verification_decision",
    object_id: (metadata.decision_id as string) ?? null,
    policy_id: metadata.policy_id as string,
    policy_version: metadata.policy_version as number,
    metadata,
    created_at,
  };
}

describe("partnerFlowTraceAudit", () => {
  it("passes correlated passport → complete sequence", () => {
    const result = analyzePartnerFlowTrace(TRACE, [
      event("partner_flow.evaluate", {
        flow_trace_id: TRACE,
        partner_id: "good-trouble-cannabis",
        policy_id: "good-trouble-retail-v1",
        policy_version: 1,
        verification_request_id: "00000000-0000-4000-8000-0000000000aa",
        outcome: "passport",
      }, "2026-08-05T00:00:01.000Z"),
      event("partner_flow.consent", {
        flow_trace_id: TRACE,
        partner_id: "good-trouble-cannabis",
        policy_id: "good-trouble-retail-v1",
        policy_version: 1,
        verification_request_id: "00000000-0000-4000-8000-0000000000aa",
        decision_id: "vd-1",
        outcome: "approved",
      }, "2026-08-05T00:00:02.000Z"),
      event("partner_flow.receipt_issued", {
        flow_trace_id: TRACE,
        partner_id: "good-trouble-cannabis",
        policy_id: "good-trouble-retail-v1",
        policy_version: 1,
        verification_request_id: "00000000-0000-4000-8000-0000000000aa",
        decision_id: "vd-1",
        receipt_id: "dr-1",
        outcome: "issued",
        replay_status: "issued",
      }, "2026-08-05T00:00:03.000Z"),
      event("partner_flow.complete", {
        flow_trace_id: TRACE,
        partner_id: "good-trouble-cannabis",
        policy_id: "good-trouble-retail-v1",
        policy_version: 1,
        verification_request_id: "00000000-0000-4000-8000-0000000000aa",
        decision_id: "vd-1",
        receipt_id: "dr-1",
        outcome: "enter",
        replay_status: "idempotent_replay",
        validity: "active",
        currently_valid: true,
      }, "2026-08-05T00:00:04.000Z"),
    ]);

    expect(result.correlation_ok).toBe(true);
    expect(result.sequence_ok).toBe(true);
    expect(result.linkage_ok).toBe(true);
    expect(result.pii_ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("flags duplicate receipt_issued events", () => {
    const result = analyzePartnerFlowTrace(TRACE, [
      event("partner_flow.receipt_issued", {
        flow_trace_id: TRACE,
        partner_id: "p",
        policy_id: "pol",
        receipt_id: "dr-1",
        outcome: "issued",
      }, "2026-08-05T00:00:01.000Z"),
      event("partner_flow.receipt_issued", {
        flow_trace_id: TRACE,
        partner_id: "p",
        policy_id: "pol",
        receipt_id: "dr-2",
        outcome: "issued",
      }, "2026-08-05T00:00:02.000Z"),
    ]);

    expect(result.linkage_ok).toBe(false);
    expect(result.issues).toContain("duplicate_receipt_issued_events:2");
  });

  it("flags metadata PII violations", () => {
    const result = analyzePartnerFlowTrace(TRACE, [
      event("partner_flow.evaluate", {
        flow_trace_id: TRACE,
        partner_id: "p",
        policy_id: "pol",
        outcome: "passport",
        email: "leak@example.com",
      }, "2026-08-05T00:00:01.000Z"),
    ]);

    expect(result.pii_ok).toBe(false);
    expect(result.issues.some(i => i.includes("forbidden_key:email"))).toBe(true);
  });
});
