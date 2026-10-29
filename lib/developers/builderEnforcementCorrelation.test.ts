import { describe, expect, it } from "vitest";
import { correlateBuilderEnforcementReceipts } from "@/lib/developers/builderEnforcementCorrelation";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";

const bind = {
  partnerId: "studio-acme",
  applicationId: "app-1",
  policyId: "studio-acme-wallet_control-v1",
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

describe("builderEnforcementCorrelation", () => {
  it("rejects orphan access_decision without correlated chain", () => {
    const chains = correlateBuilderEnforcementReceipts(
      [event({ event_type: "access_decision_permit", outcome: "permit" })],
      bind,
    );
    expect(chains[0]?.correlated_permit_chain).toBe(false);
  });

  it("accepts correlated permit chain", () => {
    const chains = correlateBuilderEnforcementReceipts(
      [
        event({ event_type: "hosted_handoff_created" }),
        event({ event_type: "receipt_issued" }),
        event({ event_type: "receipt_verification_succeeded", outcome: "permitted" }),
        event({ event_type: "access_decision_permit", outcome: "permit" }),
      ],
      bind,
    );
    expect(chains[0]?.correlated_permit_chain).toBe(true);
  });

  it("joins handoff events that only carry request_id into receipt-scoped chains", () => {
    const chains = correlateBuilderEnforcementReceipts(
      [
        event({ event_type: "hosted_handoff_created", receipt_id: null }),
        event({ event_type: "receipt_issued", receipt_id: null }),
        event({ event_type: "receipt_verification_succeeded", outcome: "permitted" }),
        event({ event_type: "access_decision_permit", outcome: "permit" }),
      ],
      bind,
    );
    expect(chains[0]?.correlated_permit_chain).toBe(true);
  });

  it("rejects events bound to another tenant", () => {
    const chains = correlateBuilderEnforcementReceipts(
      [event({ partner_id: "other-tenant", event_type: "access_decision_permit" })],
      bind,
    );
    expect(chains).toHaveLength(0);
  });

  it("rejects harness receipt ids", () => {
    const chains = correlateBuilderEnforcementReceipts(
      [event({ receipt_id: "dr_harness_abc", event_type: "access_decision_permit" })],
      bind,
    );
    expect(chains).toHaveLength(0);
  });
});
