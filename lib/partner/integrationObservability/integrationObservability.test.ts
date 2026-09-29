import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  buildIntegrationEventRow,
  listIntegrationEventsForTests,
  recordIntegrationEvent,
  resetIntegrationEventsForTests,
} from "./record";
import {
  integrationObservabilityLeaks,
  sanitizeIntegrationEventMetadata,
} from "./sanitize";
import { partnerSafeFailureCode } from "./failureCodes";
import { instrumentVerifyForActionResult } from "./instrument";
import { buildIntegrationTimeline } from "./timeline";
import { buildIntegrationAuditExport } from "./export";
import { buildIntegrationOperationalHealth } from "./health";
import { runIntegrationSmokeTest } from "./smokeTest";

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
  allowed_return_urls: ["http://localhost:3000/callback"],
  api_key_id: "key-sandbox",
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

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

vi.mock("@/lib/partner/launchpad/partnerFlowRequest", () => ({
  loadPartnerFlowStoredConfig: vi.fn(async () => ({
    action: "enter",
    purpose: "age_gate",
    callback_url: "http://localhost:3000/callback",
  })),
}));

describe("integration observability contract", () => {
  beforeEach(() => {
    resetIntegrationEventsForTests();
  });

  it("sanitizes metadata to the allowlist and strips secrets", () => {
    const sanitized = sanitizeIntegrationEventMetadata({
      replay_status: "issued",
      email: "holder@example.com",
      callback_url: "https://secret.example/callback",
      api_key: "abx_live_deadbeef1234567890",
    });
    expect(sanitized).toEqual({ replay_status: "issued" });
    expect(integrationObservabilityLeaks(sanitized)).toEqual([]);
  });

  it("detects prohibited telemetry fields", () => {
    const leaks = integrationObservabilityLeaks({
      date_of_birth: "1990-01-01",
      legal_name: "Jane Doe",
      wallet_address: "0xabc",
    });
    expect(leaks.length).toBeGreaterThan(0);
    expect(JSON.stringify(leaks)).not.toContain("1990-01-01");
  });

  it("maps kit errors to partner-safe failure codes without raw exceptions", () => {
    expect(partnerSafeFailureCode(["request_correlation_mismatch"], "wrong_request_correlation")).toBe("request_mismatch");
    expect(partnerSafeFailureCode(["receipt_missing"])).toBe("receipt_missing");
    expect(partnerSafeFailureCode(["unexpected SQLSTATE 23505"])).toBe("unknown");
  });

  it("records a correlated lifecycle timeline by request_id", async () => {
    const requestId = "req_correlation_1";
    await recordIntegrationEvent({
      partnerId: "partner-a",
      applicationId: APP.id,
      environment: "sandbox",
      eventType: "verification_request_created",
      lifecycleStage: "request",
      requestId,
    });
    await recordIntegrationEvent({
      partnerId: "partner-a",
      applicationId: APP.id,
      environment: "sandbox",
      eventType: "holder_flow_started",
      lifecycleStage: "holder",
      requestId,
    });
    await recordIntegrationEvent({
      partnerId: "partner-a",
      applicationId: APP.id,
      environment: "sandbox",
      eventType: "receipt_issued",
      lifecycleStage: "receipt",
      requestId,
      receiptId: "dr_safe",
    });
    await recordIntegrationEvent({
      partnerId: "partner-a",
      applicationId: APP.id,
      environment: "sandbox",
      eventType: "receipt_verification_succeeded",
      lifecycleStage: "verification",
      requestId,
      receiptId: "dr_safe",
      latencyMs: 42,
    });
    await recordIntegrationEvent({
      partnerId: "partner-a",
      applicationId: APP.id,
      environment: "sandbox",
      eventType: "access_decision_permit",
      lifecycleStage: "decision",
      requestId,
      receiptId: "dr_safe",
      outcome: "permit",
    });

    const timeline = await buildIntegrationTimeline({
      partnerId: "partner-a",
      applicationId: APP.id,
      requestId,
    });
    expect(timeline.ok).toBe(true);
    if (timeline.ok) {
      expect(timeline.entries).toHaveLength(5);
      expect(timeline.entries.map((entry) => entry.event_type)).toEqual(
        expect.arrayContaining([
          "verification_request_created",
          "holder_flow_started",
          "receipt_issued",
          "receipt_verification_succeeded",
          "access_decision_permit",
        ]),
      );
      expect(JSON.stringify(timeline)).not.toMatch(/email|date_of_birth|abx_live_/i);
    }
  });

  it("scopes partner B out of partner A diagnostics", async () => {
    await recordIntegrationEvent({
      partnerId: "partner-a",
      applicationId: APP.id,
      environment: "sandbox",
      eventType: "verification_request_created",
      lifecycleStage: "request",
      requestId: "req_a",
    });
    await recordIntegrationEvent({
      partnerId: "partner-b",
      applicationId: "22222222-2222-2222-2222-222222222222",
      environment: "sandbox",
      eventType: "verification_request_created",
      lifecycleStage: "request",
      requestId: "req_b",
    });

    const timeline = await buildIntegrationTimeline({
      partnerId: "partner-a",
      requestId: "req_b",
    });
    expect(timeline.ok).toBe(true);
    if (timeline.ok) expect(timeline.entries).toHaveLength(0);
  });

  it("builds operational health from persisted verification events only", async () => {
    await recordIntegrationEvent({
      partnerId: APP.partner_id,
      applicationId: APP.id,
      environment: "sandbox",
      eventType: "receipt_verification_succeeded",
      lifecycleStage: "verification",
      latencyMs: 10,
    });
    await recordIntegrationEvent({
      partnerId: APP.partner_id,
      applicationId: APP.id,
      environment: "sandbox",
      eventType: "receipt_verification_failed",
      lifecycleStage: "verification",
      partnerSafeReason: "request_mismatch",
    });

    const events = listIntegrationEventsForTests();
    const health = await buildIntegrationOperationalHealth({
      application: APP,
      events,
      webhookConfigured: false,
    });
    expect(health.verification_attempts).toBe(2);
    expect(health.verification_successes).toBe(1);
    expect(health.verification_failures).toBe(1);
    expect(health.verification_success_rate).toBe(0.5);
    expect(health.recent_failure_codes).toContain("request_mismatch");
    expect(health.webhook_status).toBe("not_selected");
    expect(JSON.stringify(health)).not.toMatch(/abx_live_|whsec_|https:\/\//);
  });

  it("exports privacy-safe audit JSON", async () => {
    const row = buildIntegrationEventRow({
      partnerId: APP.partner_id,
      applicationId: APP.id,
      environment: "sandbox",
      eventType: "receipt_issued",
      lifecycleStage: "receipt",
      receiptId: "dr_export",
      requestId: "req_export",
    });
    const exported = buildIntegrationAuditExport({
      partnerId: APP.partner_id,
      applicationId: APP.id,
      environment: "sandbox",
      events: [row],
    });
    expect("contract_version" in exported).toBe(true);
    if ("contract_version" in exported) {
      expect(exported.event_count).toBe(1);
      expect(exported.events[0]?.receipt_id).toBe("dr_export");
      expect(JSON.stringify(exported)).not.toContain("passport");
    }
  });

  it("runs plumbing smoke test without creating identity receipts", async () => {
    const result = await runIntegrationSmokeTest({
      application: APP,
      partnerId: APP.partner_id,
    });
    expect(result.identity_receipt_created).toBe(false);
    expect(result.probes.some((probe) => probe.id === "verification_endpoint_reachable")).toBe(true);
    expect(listIntegrationEventsForTests().some((event) => event.event_type === "integration_smoke_completed")).toBe(true);
  });

  it("records verifyForAction telemetry when applicationId is configured", async () => {
    resetIntegrationEventsForTests();
    const base = {
      receipt_id: "dr_kit",
      schema_version: "1.0.0",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
      policy_version: 1,
      decision_result: "approved",
      signature_valid: true,
      expires_at: "2099-01-01T00:00:00.000Z",
      status: "active",
      production_usable: false,
      decision_context: "sandbox_only",
      currently_valid: true,
      invalidation_reasons: [] as string[],
      artifact_type: "eligibility_decision_receipt",
    };
    await instrumentVerifyForActionResult({
      options: {
        partnerId: "partner-acme",
        policyId: "partner-acme-age_21_retail-v1",
        environment: "sandbox",
        applicationId: APP.id,
        policyVersion: 1,
      },
      verifyInput: { receiptId: "dr_kit", expectedRequestId: "req_1" },
      result: {
        kit_version: "1.1.0",
        outcome: "permitted",
        action: "permit",
        errors: [],
        receipt_id: "dr_kit",
        decision_result: "approved",
        status: "active",
        policy_id: "partner-acme-age_21_retail-v1",
        partner_id: "partner-acme",
        production_usable: false,
        callback_trusted: false,
        google_sign_in_is_not_eligibility: "Google sign-in is not eligibility.",
        replay_behavior: "Public GET is not replay protection.",
      },
      latencyMs: 25,
    });

    const events = listIntegrationEventsForTests();
    expect(events.some((event) => event.event_type === "receipt_verification_succeeded")).toBe(true);
    expect(events.some((event) => event.event_type === "access_decision_permit")).toBe(true);
    expect(events.find((event) => event.event_type === "receipt_verification_succeeded")?.latency_ms).toBe(25);
    expect(JSON.stringify(events)).not.toMatch(/abx_live_|email|legal_name/i);
  });

  it("rejects export payloads that would leak callback URLs", () => {
    expect(integrationObservabilityLeaks({ callback_url: "https://evil.example/cb" })).toContain("callback_url");
  });
});
