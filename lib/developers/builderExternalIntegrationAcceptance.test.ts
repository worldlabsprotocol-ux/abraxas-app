import { describe, expect, it } from "vitest";
import { deriveBuilderIntegrationAcceptance } from "@/lib/developers/builderExternalIntegrationAcceptance";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";

const bind = {
  partnerId: "studio-test",
  applicationId: "app-1",
  policyId: "studio-test-wallet_control-v1",
};

function event(partial: Partial<IntegrationEventRow> & Pick<IntegrationEventRow, "event_type">): IntegrationEventRow {
  return {
    event_id: "ie_test",
    created_at: new Date().toISOString(),
    partner_id: bind.partnerId,
    application_id: bind.applicationId,
    environment: "sandbox",
    lifecycle_stage: "decision",
    outcome: null,
    partner_safe_reason: null,
    request_id: "req-1",
    receipt_id: "dr_live_1",
    policy_id: bind.policyId,
    policy_version: 1,
    correlation_id: null,
    handoff_ref: null,
    latency_ms: null,
    metadata: {},
    ...partial,
  };
}

describe("builderExternalIntegrationAcceptance", () => {
  it("does not complete on partner events alone without platform verification", () => {
    const view = deriveBuilderIntegrationAcceptance({
      sandboxHarnessSucceeded: true,
      events: [
        event({ event_type: "hosted_handoff_created" }),
        event({ event_type: "receipt_issued" }),
        event({ event_type: "receipt_verification_succeeded", outcome: "permitted" }),
        event({ event_type: "access_decision_permit", outcome: "permit" }),
      ],
      bind,
      platformVerifications: [],
    });
    expect(view.phase).not.toBe("application_enforcement_confirmed");
    expect(view.enforcement_evidence_class).toBe("partner_reported");
    expect(view.blockers.length).toBeGreaterThan(0);
  });

  it("completes only with correlated events and platform verified permit", () => {
    const view = deriveBuilderIntegrationAcceptance({
      sandboxHarnessSucceeded: true,
      events: [
        event({ event_type: "hosted_handoff_created" }),
        event({ event_type: "receipt_issued" }),
        event({ event_type: "receipt_verification_succeeded", outcome: "permitted" }),
        event({ event_type: "access_decision_permit", outcome: "permit" }),
      ],
      bind,
      platformVerifications: [{
        receipt_id: "dr_live_1",
        ok: true,
        unavailable: false,
        cryptographically_authentic: true,
        currently_acceptable: "yes",
        enforcement_action: "permit",
        failure_codes: [],
      }],
    });
    expect(view.phase).toBe("application_enforcement_confirmed");
    expect(view.enforcement_evidence_class).toBe("platform_independently_verified");
    expect(view.external_enforcement.verified_permit).toBe(true);
  });
});
