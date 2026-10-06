// FILE: lib/partner/pilotEvidence/pilotEvidence.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  buildIntegrationEventRow,
  resetIntegrationEventsForTests,
} from "@/lib/partner/integrationObservability/record";
import {
  buildPartnerPilotSummary,
  buildInvestorDiligenceExport,
  computePartnerValueMetrics,
  distinctRequestKeys,
  pilotEvidenceLeaks,
  privacyFactsForPack,
  recordLaunchpadActivityForTests,
  resetLaunchpadActivityForTests,
} from "@/lib/partner/pilotEvidence";

const APP: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "acme-app",
  partner_id: "partner-a",
  application_name: "Acme",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "partner-a-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["https://acme.example/callback"],
  api_key_id: "key-sandbox",
  production_api_key_id: null,
  production_key_revealed_at: null,
  production_activated_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function event(
  overrides: Partial<ReturnType<typeof buildIntegrationEventRow>> & {
    event_type?: string;
    request_id?: string | null;
    receipt_id?: string | null;
    policy_id?: string | null;
    environment?: "sandbox" | "production";
    metadata?: Record<string, string | number | boolean | null>;
  },
) {
  return buildIntegrationEventRow({
    partnerId: APP.partner_id,
    applicationId: APP.id,
    environment: overrides.environment ?? "sandbox",
    eventType: (overrides.event_type ?? "verification_request_created") as never,
    lifecycleStage: "request",
    requestId: overrides.request_id ?? "req_1",
    receiptId: overrides.receipt_id ?? null,
    policyId: overrides.policy_id ?? APP.policy_id,
    policyVersion: 1,
    metadata: overrides.metadata,
  });
}

vi.mock("@/lib/partner/launchpad/goLiveReadiness/load", () => ({
  loadGoLiveEvidence: vi.fn(async () => ({
    applicationId: APP.id,
    partnerId: APP.partner_id,
    status: "active",
    environment: "sandbox",
    policyId: APP.policy_id,
    policyVersion: 1,
    policyTemplateId: "age_21_retail",
    allowedReturnUrls: APP.allowed_return_urls,
    activeSandboxKey: true,
    webhookConfigured: false,
    webhookEnabled: false,
    latestDeliveryStatus: null,
    verifiedHostnames: [],
    starterKitEvidenced: true,
    starterKitRuntime: "typescript_nextjs",
    request: null,
  })),
}));

describe("partner pilot evidence layer", () => {
  beforeEach(() => {
    resetIntegrationEventsForTests();
    resetLaunchpadActivityForTests();
  });

  it("reports zero usage truthfully for empty integration", () => {
    const summary = buildPartnerPilotSummary({
      application: APP,
      events: [],
      activity: [],
      environment: "sandbox",
    });
    expect(summary.metrics.total_requests.value).toBe(0);
    expect(summary.metrics.receipts_issued.value).toBe(0);
    expect(summary.integration_status).toBe("not_started");
    expect(summary.case_study.evidence_quality.cost_savings).toBe("unavailable");
    expect(summary.case_study.evidence_quality.revenue_impact).toBe("unavailable");
  });

  it("dedupes one request with retry verification attempts", () => {
    const events = [
      event({ event_type: "verification_request_created", request_id: "req_same" }),
      event({ event_type: "holder_flow_completed", request_id: "req_same" }),
      event({ event_type: "receipt_issued", request_id: "req_same", receipt_id: "dr_1" }),
      event({ event_type: "receipt_verification_succeeded", request_id: "req_same", receipt_id: "dr_1", metadata: { replay_status: "issued" } }),
      event({ event_type: "receipt_verification_failed", request_id: "req_same", receipt_id: "dr_1" }),
      event({ event_type: "receipt_verification_succeeded", request_id: "req_same", receipt_id: "dr_1" }),
    ];
    const metrics = computePartnerValueMetrics(events);
    expect(distinctRequestKeys(events).size).toBe(1);
    expect(metrics.total_requests.value).toBe(1);
    expect(metrics.verification_attempts.value).toBe(3);
    expect(metrics.unique_receipts_verified.value).toBe(1);
  });

  it("counts repeat requests without holder fingerprinting", () => {
    const events = [
      event({ event_type: "holder_flow_completed", request_id: "req_a" }),
      event({ event_type: "holder_flow_completed", request_id: "req_b" }),
    ];
    const metrics = computePartnerValueMetrics(events);
    expect(metrics.repeat_request_count.value).toBe(1);
    expect(metrics.repeat_holder_usage.quality).toBe("unavailable");
    expect(metrics.repeat_holder_usage.value).toBeNull();
  });

  it("separates sandbox and production environments", () => {
    const sandbox = event({ event_type: "receipt_issued", receipt_id: "dr_s", environment: "sandbox" });
    const production = event({
      event_type: "receipt_issued",
      receipt_id: "dr_p",
      environment: "production",
      policy_id: "partner-a-age_21_retail-v1",
    });
    const sandboxSummary = buildPartnerPilotSummary({
      application: APP,
      events: [sandbox, production],
      activity: [],
      environment: "sandbox",
    });
    expect(sandboxSummary.metrics.receipts_issued.value).toBe(1);
    expect(sandboxSummary.environment).toBe("sandbox");
  });

  it("tracks reuse economics from integration events", () => {
    const events = [
      event({ event_type: "evidence_reuse_accepted", request_id: "req_r1" }),
      event({ event_type: "evidence_refresh_required", request_id: "req_r2" }),
    ];
    const metrics = computePartnerValueMetrics(events);
    expect(metrics.evidence_reuse_count.value).toBe(1);
    expect(metrics.evidence_refresh_required_count.value).toBe(1);
    expect(metrics.reuse_rate.value).toBe(0.5);
  });

  it("builds policy-specific consumption for age and residency", () => {
    const events = [
      event({ policy_id: "partner-a-age_21_retail-v1", event_type: "verification_request_created" }),
      event({ policy_id: "partner-a-residency_us-v1", event_type: "verification_request_created", request_id: "req_res" }),
    ];
    const summary = buildPartnerPilotSummary({
      application: APP,
      events,
      activity: [],
      environment: "sandbox",
    });
    expect(summary.policy_consumption).toHaveLength(2);
    expect(summary.policy_consumption.map((row) => row.result_family).sort()).toEqual(
      ["age_eligible_21", "residency_check_passed"].sort(),
    );
  });

  it("exposes privacy-minimization facts without holder data", () => {
    const age = privacyFactsForPack("age_21_retail");
    const residency = privacyFactsForPack("residency_us");
    expect(age.partner_receives).toEqual(["age_eligible_21"]);
    expect(age.partner_does_not_receive).toContain("date of birth");
    expect(residency.partner_does_not_receive).toContain("street address");
    const leaks = pilotEvidenceLeaks({ summary: { privacy_facts: [age, residency] } });
    expect(leaks).not.toContain("pii");
  });

  it("rejects PII and commercial fiction in exports", () => {
    expect(pilotEvidenceLeaks({ legal_name: "Jane Doe" }).length).toBeGreaterThan(0);
    expect(pilotEvidenceLeaks({ headline: "fake ARR projection" }).length).toBeGreaterThan(0);
    expect(pilotEvidenceLeaks({ note: "estimated revenue impact for deck" }).length).toBeGreaterThan(0);
  });

  it("builds investor diligence export with metric definitions", () => {
    const summary = buildPartnerPilotSummary({
      application: APP,
      events: [event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_x" })],
      activity: [],
      environment: "sandbox",
    });
    const exported = buildInvestorDiligenceExport(summary);
    expect("ok" in exported).toBe(false);
    if ("ok" in exported) return;
    expect(exported.export_kind).toBe("investor_diligence");
    expect(exported.metric_definitions.length).toBeGreaterThan(0);
    expect(exported.summary.case_study.evidence_quality.verification_success_rate).toBe("derived");
  });

  it("computes time-to-value from durable timestamps", () => {
    recordLaunchpadActivityForTests({
      partner_id: APP.partner_id,
      application_id: APP.id,
      event_type: "production_access_requested",
      public_code: null,
      metadata: {},
      created_at: "2026-02-01T00:00:00.000Z",
    });
    const events = [
      event({ event_type: "verification_request_created", request_id: "req_ttv" }),
      event({ event_type: "receipt_issued", request_id: "req_ttv", receipt_id: "dr_ttv" }),
    ];
    events[0]!.created_at = "2026-01-15T00:00:00.000Z";
    events[1]!.created_at = "2026-01-16T00:00:00.000Z";
    const summary = buildPartnerPilotSummary({
      application: APP,
      events,
      activity: [{
        event_type: "production_access_requested",
        public_code: null,
        metadata: {},
        created_at: "2026-02-01T00:00:00.000Z",
      }],
      environment: "sandbox",
    });
    expect(summary.time_to_value.application_created_to_first_sandbox_request_ms.value).toBe(
      new Date("2026-01-15T00:00:00.000Z").getTime() - new Date(APP.created_at).getTime(),
    );
    expect(summary.time_to_value.application_created_to_production_request_ms.value).toBe(
      new Date("2026-02-01T00:00:00.000Z").getTime() - new Date(APP.created_at).getTime(),
    );
  });

  it("enforces tenant scope via partner_id on summary", () => {
    const summary = buildPartnerPilotSummary({
      application: APP,
      events: [],
      activity: [],
      environment: "sandbox",
    });
    expect(summary.partner_id).toBe("partner-a");
    expect(summary.application_id).toBe(APP.id);
    expect(JSON.stringify(summary)).not.toContain("partner-b");
  });
});
