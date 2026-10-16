// FILE: lib/partner/build583.institutionalActivationMilestones.test.ts

import { describe, expect, it } from "vitest";
import { buildInstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import { resolveLaunchpadJourneyState } from "@/lib/partner/launchpad/journeyState";

describe("institutional activation milestones", () => {
  it("marks early milestones current when only provisioned", () => {
    const journey = resolveLaunchpadJourneyState({
      application: {
        id: "app_583",
        status: "active",
        environment: "sandbox",
        policy_template_id: "sandbox_institutional_protocol_access",
        policy_id: "sandbox_institutional_protocol_access",
        integration_status: "ready",
        allowed_return_urls: [],
        key_prefix: "abx_sandbox",
      },
      configuredPolicyCount: 1,
      verifiedReceiptCount: 0,
      activeSandboxKey: true,
      starterKitEvidenced: false,
    });

    const evidence = buildInstitutionalActivationEvidence({
      applicationCreatedAt: "2026-01-01T00:00:00.000Z",
      journey,
      health: null,
      activeSandboxKey: true,
      starterKitEvidenced: false,
      callbackConfigured: false,
    });

    expect(evidence.milestones[0]?.status).toBe("complete");
    expect(evidence.time_to_first_independent_verify_quality).toBe("unavailable");
    expect(evidence.current_milestone_id).not.toBe("independent_verification_succeeded");
  });

  it("measures time to first independent verify when verification event exists", () => {
    const evidence = buildInstitutionalActivationEvidence({
      applicationCreatedAt: "2026-01-01T00:00:00.000Z",
      journey: null,
      health: {
        contract_version: "1.0.0",
        status: "healthy",
        environment: "sandbox",
        application_id: "app_583",
        partner_id: "partner_583",
        last_request_at: "2026-01-01T01:00:00.000Z",
        last_receipt_issued_at: "2026-01-01T01:05:00.000Z",
        last_receipt_verified_at: "2026-01-01T00:10:00.000Z",
        verification_attempts: 1,
        verification_successes: 1,
        verification_failures: 0,
        verification_success_rate: 1,
        recent_failure_codes: [],
        credential_status: "active",
        callback_status: "ready",
        production_readiness_ok: false,
        production_readiness_blockers: [],
        webhook_status: "not_selected",
        recent_timeline: [],
        technical_proof: [
          { stage: "Receipt verified server-side", status: "observed", at: "2026-01-01T00:10:00.000Z" },
        ],
      },
      activeSandboxKey: true,
      starterKitEvidenced: true,
      callbackConfigured: true,
    });

    expect(evidence.time_to_first_independent_verify_quality).toBe("measured");
    expect(evidence.time_to_first_independent_verify_ms).toBe(10 * 60 * 1000);
  });
});
