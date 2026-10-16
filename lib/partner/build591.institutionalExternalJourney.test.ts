// FILE: lib/partner/build591.institutionalExternalJourney.test.ts

import { describe, expect, it } from "vitest";
import {
  INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS,
  INSTITUTIONAL_DEVELOPER_JOURNEY_VERSION,
} from "@/lib/partner/launchpad/institutionalDeveloperJourney";
import { buildInstitutionalFirstVerifiedOutcomeView } from "@/lib/partner/launchpad/institutionalFirstVerifiedOutcome";
import { buildInstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import type { IntegrationOperationalHealth } from "@/lib/partner/integrationObservability/health";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

function healthFromEvents(app: LaunchpadApplicationRow, events: IntegrationEventRow[]): IntegrationOperationalHealth {
  const verificationEvents = events.filter(
    (event) =>
      event.event_type === "receipt_verification_succeeded"
      || event.event_type === "receipt_verification_failed",
  );
  const successes = verificationEvents.filter((event) => event.event_type === "receipt_verification_succeeded").length;
  const failures = verificationEvents.filter((event) => event.event_type === "receipt_verification_failed").length;
  return {
    contract_version: "1.0.0",
    status: failures > 0 ? "degraded" : "healthy",
    environment: app.environment,
    application_id: app.id,
    partner_id: app.partner_id,
    last_request_at: null,
    last_receipt_issued_at: null,
    last_receipt_verified_at: events.find((e) => e.event_type === "receipt_verification_succeeded")?.created_at ?? null,
    verification_attempts: successes + failures,
    verification_successes: successes,
    verification_failures: failures,
    verification_success_rate: successes + failures > 0 ? successes / (successes + failures) : null,
    recent_failure_codes: [],
    credential_status: "active",
    callback_status: "ready",
    production_readiness_ok: false,
    production_readiness_blockers: [],
    webhook_status: "not_selected",
    recent_timeline: [],
    technical_proof: [
      {
        stage: "Receipt verified server-side",
        status: successes > 0 ? "observed" : failures > 0 ? "failed" : "pending",
        at: verificationEvents[0]?.created_at ?? null,
      },
    ],
  };
}

describe("Build #591 external institutional journey", () => {
  it("defines eight canonical steps with real routes", () => {
    expect(INSTITUTIONAL_DEVELOPER_JOURNEY_VERSION).toBe("591.v2");
    expect(INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS).toHaveLength(9);
    for (const step of INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS) {
      expect(step.href.startsWith("/")).toBe(true);
      expect(step.href).not.toContain("undefined");
    }
  });

  it("builds partner-safe first verified outcome from integration events", () => {
    const app = {
      id: "app-591",
      public_slug: "ext-inst",
      partner_id: "partner-ext",
      application_name: "External Integrator",
      display_name: "External Integrator",
      environment: "sandbox",
      policy_id: "sandbox_institutional_protocol_access",
      policy_version: 1,
      policy_template_id: "sandbox_institutional_protocol_access",
      allowed_return_urls: ["https://integrator.example/cb"],
      api_key_id: "key",
      production_api_key_id: null,
      production_key_revealed_at: null,
      status: "active",
      idempotency_key: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } satisfies LaunchpadApplicationRow;

    const events: IntegrationEventRow[] = [
      {
        event_id: "ie_ok",
        created_at: "2026-01-02T00:00:00.000Z",
        partner_id: "partner-ext",
        application_id: "app-591",
        environment: "sandbox",
        event_type: "receipt_verification_succeeded",
        lifecycle_stage: "verification",
        outcome: "permitted",
        partner_safe_reason: null,
        request_id: "req_591",
        receipt_id: "dr_591",
        policy_id: "sandbox_institutional_protocol_access",
        policy_version: 1,
        correlation_id: null,
        handoff_ref: null,
        latency_ms: 8,
        metadata: {},
      },
    ];

    const health = healthFromEvents(app, events);

    const activation = buildInstitutionalActivationEvidence({
      applicationCreatedAt: app.created_at,
      journey: null,
      health,
      activeSandboxKey: true,
      starterKitEvidenced: true,
      callbackConfigured: true,
    });

    const outcome = buildInstitutionalFirstVerifiedOutcomeView({
      app,
      health,
      events,
      activation,
      receiptKeyDocumentDigest: "digest_v2_example",
    });

    expect(outcome.status).toBe("success");
    expect(outcome.verification.result).toBe("authorized");
    expect(outcome.receipt_provenance.receipt_id).toBe("dr_591");
    expect(outcome.adoption.time_to_first_independent_verify_quality).toBe("measured");
    expect(outcome.verification.independent_verification_recorded).toBe(true);
    expect(outcome.evidence.integration_export_href).toContain("integration-export");
    expect(outcome.issuer_trust.offline_verifier_notice).toMatch(/Supabase/);
    expect(JSON.stringify(outcome)).not.toMatch(/email|ssn|passport_number/i);
  });

  it("surfaces partner-safe rejection on failed verification", () => {
    const app = {
      id: "app-fail",
      public_slug: "ext-fail",
      partner_id: "partner-ext",
      application_name: "Fail App",
      display_name: "Fail App",
      environment: "sandbox",
      policy_id: "sandbox_institutional_protocol_access",
      policy_version: 1,
      policy_template_id: "sandbox_institutional_protocol_access",
      allowed_return_urls: [],
      api_key_id: null,
      production_api_key_id: null,
      production_key_revealed_at: null,
      status: "active",
      idempotency_key: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } satisfies LaunchpadApplicationRow;

    const events: IntegrationEventRow[] = [
      {
        event_id: "ie_fail",
        created_at: "2026-01-02T00:00:00.000Z",
        partner_id: "partner-ext",
        application_id: "app-fail",
        environment: "sandbox",
        event_type: "receipt_verification_failed",
        lifecycle_stage: "verification",
        outcome: "denied",
        partner_safe_reason: "policy_mismatch",
        request_id: "req_fail",
        receipt_id: "dr_fail",
        policy_id: "sandbox_institutional_protocol_access",
        policy_version: 1,
        correlation_id: null,
        handoff_ref: null,
        latency_ms: null,
        metadata: {},
      },
    ];

    const health = healthFromEvents(app, events);
    const outcome = buildInstitutionalFirstVerifiedOutcomeView({
      app,
      health,
      events,
      activation: null,
      receiptKeyDocumentDigest: null,
    });

    expect(outcome.status).toBe("failure");
    expect(outcome.verification.result).toBe("rejected");
    expect(outcome.verification.partner_safe_rejection).toBe("policy_mismatch");
  });
});
