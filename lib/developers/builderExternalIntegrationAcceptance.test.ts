import { describe, expect, it } from "vitest";
import {
  deriveBuilderIntegrationAcceptance,
  isHarnessReceiptId,
} from "@/lib/developers/builderExternalIntegrationAcceptance";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";

function event(partial: Partial<IntegrationEventRow> & Pick<IntegrationEventRow, "event_type">): IntegrationEventRow {
  return {
    event_id: "ie_test",
    created_at: new Date().toISOString(),
    partner_id: "studio-test",
    application_id: "app-1",
    environment: "sandbox",
    lifecycle_stage: "decision",
    outcome: null,
    partner_safe_reason: null,
    request_id: null,
    receipt_id: null,
    policy_id: null,
    policy_version: null,
    correlation_id: null,
    handoff_ref: null,
    latency_ms: null,
    metadata: {},
    ...partial,
  };
}

describe("builderExternalIntegrationAcceptance", () => {
  it("ignores harness receipt ids for external proof", () => {
    expect(isHarnessReceiptId("dr_harness_abc")).toBe(true);
    const view = deriveBuilderIntegrationAcceptance({
      sandboxHarnessSucceeded: true,
      integrationFilesReady: true,
      serverSetupAcknowledged: true,
      events: [
        event({ event_type: "receipt_issued", receipt_id: "dr_harness_abc" }),
      ],
    });
    expect(view.phase).not.toBe("application_enforcement_confirmed");
    expect(view.live_receipt_ids).toHaveLength(0);
  });

  it("reaches enforcement confirmed on live permit decision", () => {
    const view = deriveBuilderIntegrationAcceptance({
      sandboxHarnessSucceeded: true,
      integrationFilesReady: true,
      serverSetupAcknowledged: true,
      events: [
        event({ event_type: "hosted_handoff_created", receipt_id: "dr_live_1" }),
        event({ event_type: "receipt_issued", receipt_id: "dr_live_1" }),
        event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_live_1" }),
        event({ event_type: "access_decision_permit", receipt_id: "dr_live_1" }),
      ],
    });
    expect(view.phase).toBe("application_enforcement_confirmed");
    expect(view.completion_headline).toContain("working in your application");
    expect(view.external_enforcement.permit).toBe(true);
  });
});
