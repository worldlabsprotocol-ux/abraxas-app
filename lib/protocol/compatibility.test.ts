import { describe, expect, it } from "vitest";
import {
  DECISION_RECEIPT_SCHEMA_VERSION,
  PARTNER_CALLBACK_PARAMS,
  PARTNER_FLOW_RESPONSE_FIELDS,
  PUBLIC_RECEIPT_VIEW_FIELDS,
  TRUST_DECISION_API_VERSION,
} from "./compatibility";
import { buildTrustDecision } from "@/lib/verify/trustDecision";
import type { PolicyDecisionRecord } from "@/lib/policy/types";

describe("protocol compatibility fixtures", () => {
  it("pins decision receipt schema version", () => {
    expect(DECISION_RECEIPT_SCHEMA_VERSION).toBe("1.0.0");
    expect(TRUST_DECISION_API_VERSION).toBe("1.0.0");
  });

  it("documents partner callback params without PII", () => {
    expect(PARTNER_CALLBACK_PARAMS).not.toContain("date_of_birth");
    expect(PARTNER_CALLBACK_PARAMS).toContain("receipt_id");
    expect(PARTNER_CALLBACK_PARAMS).toContain("decision_id");
  });

  it("Trust Decision exposes stable fields for GT retail", () => {
    const decision: PolicyDecisionRecord = {
      id: "vd_compat",
      request_id: "req_compat",
      partner_id: "good-trouble-cannabis",
      subject_id: "0xabc",
      policy_id: "good-trouble-retail-v1",
      policy_version: 1,
      decision: "approved",
      claims_json: {},
      reason_codes: [],
      valid_until: "2026-08-01T00:00:00.000Z",
      decided_at: "2026-07-30T00:00:00.000Z",
      status: "active",
    };
    const td = buildTrustDecision({ decision });
    expect(td.policy_id).toBe("good-trouble-retail-v1");
    expect(td.policy_version).toBe(1);
    expect(td.permission).toBe("regulated_purchase");
    expect(td.relying_party_id).toBe("good-trouble-cannabis");
  });

  it("public receipt view contract includes signature fields", () => {
    expect(PUBLIC_RECEIPT_VIEW_FIELDS).toContain("signature_valid");
    expect(PUBLIC_RECEIPT_VIEW_FIELDS).toContain("payload_hash");
  });

  it("partner flow response includes trace field for observability", () => {
    expect(PARTNER_FLOW_RESPONSE_FIELDS).toContain("flow_trace_id");
    expect(PARTNER_FLOW_RESPONSE_FIELDS).toContain("next");
  });
});
