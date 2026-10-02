import { describe, expect, it } from "vitest";
import {
  deriveDeveloperActivation,
  buildDeveloperIntegrationSummary,
  computeDeveloperTimeToProofMetrics,
  buildDeveloperIntegrationHealth,
  developerErrorRemediation,
  listDeveloperErrorRemediation,
  firstProofSuccessCopy,
} from "@/lib/partner/externalActivation";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";

function app(overrides: Partial<LaunchpadApplicationRow> = {}): LaunchpadApplicationRow {
  return {
    id: "app_test",
    public_slug: "test-app",
    partner_id: "studio-test-abc",
    application_name: "Test App",
    display_name: "Test App",
    environment: "sandbox",
    policy_id: "studio-test-abc-age_21_retail-v1",
    policy_version: 1,
    policy_template_id: "age_21_retail",
    allowed_return_urls: ["http://localhost:3000/callback"],
    api_key_id: "key_1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function event(overrides: Partial<IntegrationEventRow>): IntegrationEventRow {
  return {
    event_id: overrides.event_id ?? "evt_1",
    created_at: overrides.created_at ?? "2026-01-02T00:00:00.000Z",
    partner_id: overrides.partner_id ?? "studio-test-abc",
    application_id: overrides.application_id ?? "app_test",
    environment: overrides.environment ?? "sandbox",
    event_type: overrides.event_type ?? "receipt_verification_succeeded",
    lifecycle_stage: overrides.lifecycle_stage ?? "verification",
    outcome: overrides.outcome ?? "permitted",
    partner_safe_reason: overrides.partner_safe_reason ?? null,
    request_id: overrides.request_id ?? "vr_test",
    receipt_id: overrides.receipt_id ?? "dr_test",
    policy_id: overrides.policy_id ?? "studio-test-abc-age_21_retail-v1",
    policy_version: overrides.policy_version ?? 1,
    correlation_id: overrides.correlation_id ?? null,
    handoff_ref: overrides.handoff_ref ?? null,
    latency_ms: overrides.latency_ms ?? null,
    metadata: overrides.metadata ?? {},
  };
}

describe("external developer activation", () => {
  it("derives activation stages from backend events only", () => {
    const view = deriveDeveloperActivation({
      application: app(),
      events: [
        event({ event_type: "hosted_handoff_created", created_at: "2026-01-02T00:00:00.000Z" }),
        event({ event_type: "receipt_issued", created_at: "2026-01-02T00:01:00.000Z" }),
        event({ event_type: "receipt_verification_succeeded", created_at: "2026-01-02T00:02:00.000Z" }),
      ],
      activity: [{ public_code: "starter_kit_generated", created_at: "2026-01-01T01:00:00.000Z" }],
      activeSandboxKey: true,
      starterKitGenerated: true,
    });
    expect(view.first_proof_complete).toBe(true);
    expect(view.stages.find((s) => s.id === "first_result_verified")?.complete).toBe(true);
    expect(view.primary_action.label).toContain("production");
  });

  it("builds machine-derived integration summary without secrets", () => {
    const summary = buildDeveloperIntegrationSummary({
      application: app(),
      activeSandboxKey: true,
      keyPrefix: "abx_test",
    });
    expect(summary.integration_method).toBe("verify_with_abraxas");
    expect(summary.callback_configured).toBe(true);
    expect(summary.environment).toBe("sandbox");
    expect(JSON.stringify(summary)).not.toMatch(/abx_test_[A-Za-z0-9]+/);
  });

  it("computes privacy-safe time-to-first-proof metrics", () => {
    const metrics = computeDeveloperTimeToProofMetrics({
      application: app(),
      events: [
        event({ event_type: "hosted_handoff_created", created_at: "2026-01-01T00:10:00.000Z" }),
        event({ event_type: "receipt_verification_succeeded", created_at: "2026-01-01T00:20:00.000Z" }),
      ],
    });
    expect(metrics.time_to_first_request_ms).toBe(10 * 60 * 1000);
    expect(metrics.time_to_first_verified_result_ms).toBe(20 * 60 * 1000);
    expect(JSON.stringify(metrics)).not.toMatch(/date_of_birth|legal_name|email/);
  });

  it("maps stable error remediation categories", () => {
    expect(listDeveloperErrorRemediation().length).toBeGreaterThan(10);
    const apiKey = developerErrorRemediation("api_key_required");
    expect(apiKey.developer_action.toLowerCase()).toContain("server");
  });

  it("uses policy metadata for first-proof success copy", () => {
    const age = firstProofSuccessCopy("age_21_retail");
    expect(age.shared.length).toBeGreaterThan(0);
    expect(age.withheld.join(" ").toLowerCase()).not.toContain("eligible: yes");

    const provenance = firstProofSuccessCopy("content_origin_disclosure");
    expect(provenance.requested.toLowerCase()).toContain("content");
  });

  it("reports developer health without duplicating full observability dashboard", () => {
    const health = buildDeveloperIntegrationHealth({
      application: app(),
      events: [event({ event_type: "receipt_verification_succeeded" })],
      activeSandboxKey: true,
    });
    expect(health.items.length).toBeLessThanOrEqual(6);
    expect(health.sandbox_labeled).toBe(true);
    expect(health.items.find((i) => i.id === "first_verified")?.status).toBe("ready");
  });
});
