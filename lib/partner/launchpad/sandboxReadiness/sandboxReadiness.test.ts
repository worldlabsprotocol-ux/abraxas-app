import { describe, expect, it, beforeEach } from "vitest";
import { buildSandboxTestPlan, evaluateCallbackUrlAgainstAllowlist } from "@/lib/partner/launchpad/sandboxReadiness/plan";
import type { SandboxReadinessEvidence } from "@/lib/partner/launchpad/sandboxReadiness/plan";
import {
  buildSandboxManifest,
  sandboxManifestConformanceFixture,
  validateSandboxManifest,
} from "@/lib/partner/launchpad/sandboxReadiness/manifest";
import {
  probeHarnessFailClosed,
  probeUnsignedReceipt,
  probeWebhookHmacFixture,
  probeWrongPolicyVersion,
  rejectUnsupportedEventType,
} from "@/lib/partner/launchpad/sandboxReadiness/probes";
import { runSandboxReadinessStage } from "@/lib/partner/launchpad/sandboxReadiness/execute";
import { resetSandboxIdempotencyStoreForTests } from "@/lib/partner/launchpad/sandboxReadiness/idempotency";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

function evidence(overrides: Partial<SandboxReadinessEvidence> = {}): SandboxReadinessEvidence {
  return {
    applicationId: "app-1",
    partnerId: "acme",
    publicSlug: "acme-app",
    environment: "sandbox",
    status: "active",
    policyId: "acme-age-21-v1",
    policyVersion: 1,
    policyTemplateId: "age_21_retail",
    allowedReturnUrls: ["https://app.acme.example/auth/abraxas/callback"],
    activeSandboxKey: true,
    keyScopes: ["verify:credential", "verify:registry", "webhooks:read"],
    verifiedHostnames: ["app.acme.example"],
    harnessCompleted: [],
    webhookConfigured: true,
    webhookEnabled: true,
    latestDeliveryStatus: null,
    deliveryFailureBlocker: false,
    schemaSkipCode: null,
    unsupportedEventTypes: [],
    policySchemaReady: true,
    policyChangeControl: { status: "pass", nextAction: "No action", blockerCode: null },
    ...overrides,
  };
}

const app: LaunchpadApplicationRow = {
  id: "app-1",
  public_slug: "acme-app",
  partner_id: "acme",
  application_name: "Acme",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "acme-age-21-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["https://app.acme.example/auth/abraxas/callback"],
  api_key_id: "key-1",
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-09-18T00:00:00.000Z",
  updated_at: "2026-09-18T00:00:00.000Z",
};

describe("sandbox readiness plan", () => {
  it("blocks missing policy and missing callback", () => {
    const plan = buildSandboxTestPlan(evidence({
      policyId: "",
      policyVersion: 0,
      allowedReturnUrls: [],
    }));
    expect(plan.stages.find((stage) => stage.id === "policy_configured")?.code).toBe("policy_pin_missing");
    expect(plan.stages.find((stage) => stage.id === "callback_allowlisted")?.code).toBe("callback_missing");
    expect(plan.overall).toBe("blocked");
    expect(plan.sandbox_pass_is_not_production_authorization).toBe(true);
    expect(plan.production_activation_eligible).toBe(false);
  });

  it("labels localhost callbacks as sandbox-only", () => {
    const plan = buildSandboxTestPlan(evidence({
      allowedReturnUrls: ["http://localhost:3000/callback"],
      verifiedHostnames: [],
    }));
    expect(plan.stages.find((stage) => stage.id === "callback_allowlisted")?.code).toBe("callback_localhost_sandbox_only");
    expect(plan.production_activation_eligible).toBe(false);
  });

  it("marks happy-path stages pass and still refuses to treat sandbox as production auth", () => {
    const plan = buildSandboxTestPlan(evidence({
      harnessCompleted: ["approved", "denied", "expired", "revoked", "wrong_partner", "wrong_policy"],
      latestDeliveryStatus: "delivered",
    }));
    expect(plan.overall).toBe("pass");
    expect(plan.score.passed).toBe(6);
    expect(plan.sandbox_pass_is_not_production_authorization).toBe(true);
  });

  it("blocks policy schema unavailable and webhook failure", () => {
    const plan = buildSandboxTestPlan(evidence({
      policySchemaReady: false,
      deliveryFailureBlocker: true,
      latestDeliveryStatus: "failed",
    }));
    expect(plan.stages.find((stage) => stage.id === "policy_version_compatibility")?.code).toBe("policy_schema_unavailable");
    expect(plan.stages.find((stage) => stage.id === "webhook_test")?.code).toBe("webhook_delivery_failed");
  });
});

describe("sandbox readiness hostile probes", () => {
  it("rejects unsigned receipts", () => {
    const result = probeUnsignedReceipt({ partnerId: "acme", policyId: "acme-age-21-v1", policyVersion: 1 });
    expect(result.status).toBe("pass");
    expect(result.code).toBe("receipt_unsigned");
    expect(result.observed).toBe("deny");
  });

  it("rejects wrong partner, policy, version, denied, expired, and revoked", () => {
    const ctx = { partnerId: "acme", policyId: "acme-age-21-v1", policyVersion: 1, policyTemplateId: "age_21_retail" as const };
    expect(probeHarnessFailClosed({ ...ctx, scenarioId: "wrong_partner" }).status).toBe("pass");
    expect(probeHarnessFailClosed({ ...ctx, scenarioId: "wrong_policy" }).status).toBe("pass");
    expect(probeHarnessFailClosed({ ...ctx, scenarioId: "denied" }).status).toBe("pass");
    expect(probeHarnessFailClosed({ ...ctx, scenarioId: "expired" }).status).toBe("pass");
    expect(probeHarnessFailClosed({ ...ctx, scenarioId: "revoked" }).status).toBe("pass");
    expect(probeWrongPolicyVersion(ctx).status).toBe("pass");
  });

  it("rejects the wrong callback and missing callback", () => {
    expect(evaluateCallbackUrlAgainstAllowlist({
      allowedReturnUrls: [],
    }).code).toBe("callback_missing");
    expect(evaluateCallbackUrlAgainstAllowlist({
      allowedReturnUrls: ["https://app.acme.example/auth/abraxas/callback"],
      callbackUrl: "https://evil.example/steal",
    }).code).toBe("callback_not_allowlisted");
  });

  it("rejects unsupported event types and verifies HMAC TEST EVENT fixtures", () => {
    expect(rejectUnsupportedEventType("receipt.expired")?.code).toBe("event_type_not_supported");
    expect(probeWebhookHmacFixture("acme").code).toBe("webhook_hmac_verified");
  });
});

describe("sandbox manifest", () => {
  it("omits secrets and PII on a passing plan", () => {
    const plan = buildSandboxTestPlan(evidence({
      harnessCompleted: ["approved", "denied", "expired", "revoked", "wrong_partner", "wrong_policy"],
      latestDeliveryStatus: "delivered",
    }));
    const manifest = buildSandboxManifest({ evidence: evidence({
      harnessCompleted: ["approved", "denied", "expired", "revoked", "wrong_partner", "wrong_policy"],
      latestDeliveryStatus: "delivered",
    }), plan });
    const validated = validateSandboxManifest(manifest);
    expect(validated.ok).toBe(true);
    expect(JSON.stringify(manifest)).not.toMatch(/abx_test_|jwt|oauth|wallet|date_of_birth|email/i);
    expect(manifest.sandbox_pass_is_not_production_authorization).toBe(true);
  });

  it("rejects leaked secrets in the offline fixture", () => {
    expect(validateSandboxManifest({
      ...sandboxManifestConformanceFixture(),
      api_key: "abx_live_secret",
    }).ok).toBe(false);
  });
});

describe("sandbox readiness execution", () => {
  beforeEach(() => {
    resetSandboxIdempotencyStoreForTests();
  });

  it("returns the stored result for a duplicate idempotency key", async () => {
    const first = await runSandboxReadinessStage({
      application: app,
      partnerId: "acme",
      stage: "policy_configured",
      idempotencyKey: "run-1",
    });
    const second = await runSandboxReadinessStage({
      application: app,
      partnerId: "acme",
      stage: "policy_configured",
      idempotencyKey: "run-1",
    });
    expect(first.ok && first.result.code).toBe("policy_configured");
    expect(second.ok && second.result.duplicate).toBe(true);
    expect(second.ok && second.result.code).toBe("sandbox_run_duplicate");
    expect(second.ok && second.result.issues_production_receipt).toBe(false);
  });

  it("queues a labeled TEST EVENT without treating it as authorization", async () => {
    const executed = await runSandboxReadinessStage({
      application: app,
      partnerId: "acme",
      stage: "webhook_test",
      enqueueWebhookTest: async () => ({ ok: true, queued: true, eventId: "evt_test" }),
    });
    expect(executed.ok).toBe(true);
    if (executed.ok) {
      expect(executed.result.code).toBe("webhook_test_queued");
      expect(executed.result.production_usable).toBe(false);
      expect(executed.result.label).toBe("sandbox/test");
    }
  });

  it("blocks webhook enqueue failure and unsupported event types", async () => {
    const unsupported = await runSandboxReadinessStage({
      application: app,
      partnerId: "acme",
      stage: "webhook_test",
      eventType: "decision.denied",
    });
    expect(unsupported.ok && unsupported.result.code).toBe("event_type_not_supported");

    const failed = await runSandboxReadinessStage({
      application: app,
      partnerId: "acme",
      stage: "webhook_test",
      enqueueWebhookTest: async () => ({ ok: false, code: "webhook_not_configured" }),
    });
    expect(failed.ok && failed.result.code).toBe("webhook_not_configured");
  });
});
