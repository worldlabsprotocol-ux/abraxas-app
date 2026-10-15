// FILE: lib/passport/reusableCredential/institutionalPresentationObservability.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import { computeIntegrationVelocity } from "@/lib/partner/valueEvidence/velocity";
import {
  listIntegrationEventsForTests,
  resetIntegrationEventsForTests,
} from "@/lib/partner/integrationObservability/record";
import {
  recordInstitutionalConsentConsumedTelemetry,
  recordInstitutionalReceiptIssuedTelemetry,
} from "./institutionalPresentationObservability";

describe("institutional presentation observability", () => {
  beforeEach(() => {
    resetIntegrationEventsForTests();
  });

  it("records consent consumption and durable receipt issuance with deduplicated retries", async () => {
    const base = {
      partnerId: "institutional-rp-example",
      policyId: "institutional-age-21-v1",
      policyVersion: 1,
      environment: "sandbox" as const,
      requestId: "req_obs_582",
      consentId: "pic_consent_obs_582",
      authorizationIdempotencyKey: "cred:pc_582:institutional-rp-example:req_obs_582",
    };

    expect(await recordInstitutionalConsentConsumedTelemetry(base)).toBe(true);
    expect(await recordInstitutionalConsentConsumedTelemetry(base)).toBe(false);

    expect(
      await recordInstitutionalReceiptIssuedTelemetry({
        ...base,
        receiptId: "dr_obs_582",
        idempotentRecovery: false,
      }),
    ).toBe(true);
    expect(
      await recordInstitutionalReceiptIssuedTelemetry({
        ...base,
        receiptId: "dr_obs_582",
        idempotentRecovery: false,
      }),
    ).toBe(false);
    expect(
      await recordInstitutionalReceiptIssuedTelemetry({
        ...base,
        receiptId: "dr_obs_582",
        idempotentRecovery: true,
      }),
    ).toBe(false);

    const events = listIntegrationEventsForTests();
    expect(events.map((e) => e.event_type).sort()).toEqual(["holder_flow_completed", "receipt_issued"]);
    expect(events.every((e) => e.partner_id === base.partnerId)).toBe(true);
    expect(events.every((e) => e.request_id === base.requestId)).toBe(true);
    const blob = JSON.stringify(events).toLowerCase();
    expect(blob).not.toMatch(/date_of_birth|legal_name|passport|wallet_address/);
  });

  it("scopes velocity to application attribution and keeps verification unavailable without verify events", () => {
    const created = "2026-01-01T00:00:00.000Z";
    const metricsWithApp = computeIntegrationVelocity({
      application: {
        id: "app_a",
        partner_id: "institutional-rp-example",
        created_at: created,
        production_activated_at: null,
      } as import("@/lib/partner/launchpad/types").LaunchpadApplicationRow,
      events: [
        {
          event_id: "ie_attributed",
          partner_id: "institutional-rp-example",
          application_id: "app_a",
          environment: "sandbox",
          event_type: "holder_flow_completed",
          lifecycle_stage: "holder",
          outcome: "completed",
          partner_safe_reason: null,
          request_id: "req_attributed",
          receipt_id: null,
          policy_id: "institutional-age-21-v1",
          policy_version: 1,
          correlation_id: "cred:attributed",
          handoff_ref: null,
          latency_ms: null,
          metadata: {},
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          event_id: "ie_other_app",
          partner_id: "institutional-rp-example",
          application_id: "app_other",
          environment: "sandbox",
          event_type: "holder_flow_completed",
          lifecycle_stage: "holder",
          outcome: "completed",
          partner_safe_reason: null,
          request_id: "req_other_app",
          receipt_id: null,
          policy_id: "institutional-age-21-v1",
          policy_version: 1,
          correlation_id: "cred:other",
          handoff_ref: null,
          latency_ms: null,
          metadata: {},
          created_at: "2026-01-02T01:00:00.000Z",
        },
      ],
      activity: [],
    });
    expect(metricsWithApp.application_created_to_first_holder_consent.quality).toBe("measured");

    const metricsMissingApp = computeIntegrationVelocity({
      application: {
        id: "app_a",
        partner_id: "institutional-rp-example",
        created_at: created,
        production_activated_at: null,
      } as import("@/lib/partner/launchpad/types").LaunchpadApplicationRow,
      events: [
        {
          event_id: "ie_unattributed",
          partner_id: "institutional-rp-example",
          application_id: null,
          environment: "sandbox",
          event_type: "holder_flow_completed",
          lifecycle_stage: "holder",
          outcome: "completed",
          partner_safe_reason: null,
          request_id: "req_unattributed",
          receipt_id: null,
          policy_id: "institutional-age-21-v1",
          policy_version: 1,
          correlation_id: "cred:unattributed",
          handoff_ref: null,
          latency_ms: null,
          metadata: {},
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      activity: [],
    });
    expect(metricsMissingApp.application_created_to_first_holder_consent.quality).toBe("unavailable");
  });

  it("isolates tenant bindings for velocity metrics", () => {
    const created = "2026-01-01T00:00:00.000Z";
    const metrics = computeIntegrationVelocity({
      application: {
        id: "app_a",
        partner_id: "institutional-rp-example",
        created_at: created,
        production_activated_at: null,
      } as import("@/lib/partner/launchpad/types").LaunchpadApplicationRow,
      events: [
        {
          event_id: "ie_tenant_a",
          partner_id: "institutional-rp-example",
          application_id: "app_a",
          environment: "sandbox",
          event_type: "holder_flow_completed",
          lifecycle_stage: "holder",
          outcome: "completed",
          partner_safe_reason: null,
          request_id: "req_tenant_a",
          receipt_id: null,
          policy_id: "institutional-age-21-v1",
          policy_version: 1,
          correlation_id: "cred:a",
          handoff_ref: null,
          latency_ms: null,
          metadata: {},
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          event_id: "ie_tenant_b",
          partner_id: "sandbox-partner-beta",
          application_id: "app_b",
          environment: "sandbox",
          event_type: "receipt_verification_succeeded",
          lifecycle_stage: "verification",
          outcome: "permitted",
          partner_safe_reason: null,
          request_id: "req_tenant_b",
          receipt_id: "dr_b",
          policy_id: "institutional-age-21-beta",
          policy_version: 1,
          correlation_id: "cred:b",
          handoff_ref: null,
          latency_ms: 10,
          metadata: {},
          created_at: "2026-01-03T00:00:00.000Z",
        },
      ],
      activity: [],
    });
    expect(metrics.application_created_to_first_holder_consent.quality).toBe("measured");
    expect(metrics.application_created_to_first_successful_verification.quality).toBe("unavailable");
  });

  it("does not emit receipt issuance when idempotent recovery is reported", async () => {
    await recordInstitutionalReceiptIssuedTelemetry({
      partnerId: "institutional-rp-example",
      policyId: "institutional-age-21-v1",
      policyVersion: 1,
      environment: "sandbox",
      requestId: "req_idempotent",
      receiptId: "dr_idempotent",
      consentId: "pic_idempotent",
      authorizationIdempotencyKey: "cred:idempotent",
      idempotentRecovery: true,
    });
    expect(listIntegrationEventsForTests()).toHaveLength(0);
  });
});
