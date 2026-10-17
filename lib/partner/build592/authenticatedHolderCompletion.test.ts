// FILE: lib/partner/build592/authenticatedHolderCompletion.test.ts

import { describe, expect, it } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546SampleRecord,
} from "@/lib/institutionalCertification/build546/fixtures";
import { evaluateAuthenticatedHolderCompletionFromIntegrationExport } from "@/lib/partner/build592/authenticatedHolderCompletion";

const APPLICATION_ID = "00000000-0000-4000-8000-000000000592";

function event(
  overrides: Partial<{
    event_id: string;
    event_type: string;
    request_id: string | null;
    receipt_id: string | null;
    policy_id: string | null;
  }>,
) {
  return {
    event_id: overrides.event_id ?? "ie_test",
    at: BUILD_546_FIXTURE_NOW.toISOString(),
    event_type: overrides.event_type ?? "verification_request_created",
    lifecycle_stage: "test",
    outcome: null,
    partner_safe_reason: null,
    request_id: overrides.request_id ?? null,
    receipt_id: overrides.receipt_id ?? null,
    policy_id:
      overrides.policy_id !== undefined ? overrides.policy_id : BUILD_546_POLICY_ID,
    policy_version: 1,
    latency_ms: null,
    metadata: {},
  };
}

function evaluateForReceipt(receiptId: string, events: ReturnType<typeof event>[]) {
  return evaluateAuthenticatedHolderCompletionFromIntegrationExport({
    export: {
      partner_id: BUILD_546_PARTNER_ID,
      application_id: APPLICATION_ID,
      events,
    },
    expectedPartnerId: BUILD_546_PARTNER_ID,
    expectedApplicationId: APPLICATION_ID,
    expectedPolicyId: BUILD_546_POLICY_ID,
    expectedReceiptId: receiptId,
  });
}

describe("Build #592 authenticated holder completion binding", () => {
  const record = build546SampleRecord(undefined, { decision_context: "sandbox" });
  const requestA = "00000000-0000-4000-8000-000000000601";
  const requestB = "00000000-0000-4000-8000-000000000602";

  it("holder completion for request A plus receipt for request B does not confirm completion", () => {
    const result = evaluateForReceipt(record.id, [
      event({ event_id: "ie_req_a", event_type: "verification_request_created", request_id: requestA }),
      event({ event_id: "ie_holder_a", event_type: "holder_flow_completed", request_id: requestA }),
      event({ event_id: "ie_req_b", event_type: "verification_request_created", request_id: requestB }),
      event({
        event_id: "ie_receipt_b",
        event_type: "receipt_issued",
        request_id: requestB,
        receipt_id: record.id,
      }),
    ]);
    expect(result.status).toBe("unconfirmed");
    expect(result.detail).toBe("holder_flow_completed_not_bound_to_request");
  });

  it("matching tenant and application but unrelated receipt does not confirm completion", () => {
    const otherReceipt = "dr_unrelated_receipt_592";
    const result = evaluateForReceipt(record.id, [
      event({ event_id: "ie_req", event_type: "verification_request_created", request_id: requestA }),
      event({ event_id: "ie_holder", event_type: "holder_flow_completed", request_id: requestA }),
      event({
        event_id: "ie_receipt_other",
        event_type: "receipt_issued",
        request_id: requestA,
        receipt_id: otherReceipt,
      }),
    ]);
    expect(result.status).toBe("unconfirmed");
    expect(result.detail).toBe("receipt_issued_not_bound_to_receipt_id");
  });

  it("missing required request correlation on receipt issuance remains unconfirmed", () => {
    const result = evaluateForReceipt(record.id, [
      event({ event_id: "ie_req", event_type: "verification_request_created", request_id: requestA }),
      event({ event_id: "ie_holder", event_type: "holder_flow_completed", request_id: requestA }),
      event({
        event_id: "ie_receipt",
        event_type: "receipt_issued",
        request_id: null,
        receipt_id: record.id,
      }),
    ]);
    expect(result.status).toBe("unconfirmed");
    expect(result.detail).toBe("request_id_required_for_event_correlation");
  });

  it("properly correlated authoritative server events confirm completion", () => {
    const result = evaluateForReceipt(record.id, [
      event({ event_id: "ie_req", event_type: "verification_request_created", request_id: requestA }),
      event({ event_id: "ie_holder", event_type: "holder_flow_completed", request_id: requestA }),
      event({
        event_id: "ie_receipt",
        event_type: "receipt_issued",
        request_id: requestA,
        receipt_id: record.id,
      }),
    ]);
    expect(result.status).toBe("confirmed");
    expect(result.verification_request_id).toBe(requestA);
  });

  it("missing policy on receipt issuance does not establish policy binding", () => {
    const result = evaluateForReceipt(record.id, [
      event({ event_id: "ie_req", event_type: "verification_request_created", request_id: requestA }),
      event({ event_id: "ie_holder", event_type: "holder_flow_completed", request_id: requestA }),
      event({
        event_id: "ie_receipt",
        event_type: "receipt_issued",
        request_id: requestA,
        receipt_id: record.id,
        policy_id: null,
      }),
    ]);
    expect(result.status).toBe("unconfirmed");
    expect(result.detail).toBe("receipt_issued_policy_unspecified");
  });
});
