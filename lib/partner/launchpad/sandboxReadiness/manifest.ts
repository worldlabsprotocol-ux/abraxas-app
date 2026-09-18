// FILE: lib/partner/launchpad/sandboxReadiness/manifest.ts
// Machine-readable sandbox manifest. No secrets, PII, JWTs, OAuth, wallet, raw audit, or signing material.

import {
  SANDBOX_MANIFEST_FORBIDDEN_KEY_NEEDLES,
  SANDBOX_PASS_IS_NOT_PRODUCTION_AUTHORIZATION,
  SANDBOX_READINESS_ARTIFACT,
  SANDBOX_READINESS_LABEL,
  SANDBOX_READINESS_SCHEMA_VERSION,
  SANDBOX_SUPPORTED_RECEIPT_OUTCOMES,
  type SandboxReadinessCode,
  type SandboxReadinessStatus,
} from "@/lib/partner/launchpad/sandboxReadiness/codes";
import {
  verifiedCallbackHost,
  type SandboxReadinessEvidence,
  type SandboxTestPlan,
} from "@/lib/partner/launchpad/sandboxReadiness/plan";

export type SandboxWebhookManifestStatus =
  | "not_configured"
  | "configured_disabled"
  | "configured_enabled"
  | "delivery_failed";

export interface SandboxManifest {
  artifact: typeof SANDBOX_READINESS_ARTIFACT;
  schema_version: typeof SANDBOX_READINESS_SCHEMA_VERSION;
  environment: "sandbox";
  label: typeof SANDBOX_READINESS_LABEL;
  integration_id: string;
  public_slug: string;
  policy_id: string;
  policy_version: number;
  verified_callback_host: string | null;
  webhook_status: SandboxWebhookManifestStatus;
  supported_receipt_outcomes: typeof SANDBOX_SUPPORTED_RECEIPT_OUTCOMES;
  readiness_state: SandboxReadinessStatus;
  score: { passed: number; total: number };
  production_activation_eligible: boolean;
  sandbox_pass_is_not_production_authorization: true;
  next_action: string;
  last_run_at: string | null;
  blockers: Array<{ code: SandboxReadinessCode; detail: string }>;
  stages: Array<{
    id: string;
    status: SandboxReadinessStatus;
    code: SandboxReadinessCode;
  }>;
}

function webhookStatus(evidence: SandboxReadinessEvidence): SandboxWebhookManifestStatus {
  if (!evidence.webhookConfigured) return "not_configured";
  if (evidence.deliveryFailureBlocker) return "delivery_failed";
  if (!evidence.webhookEnabled) return "configured_disabled";
  return "configured_enabled";
}

export function buildSandboxManifest(input: {
  evidence: SandboxReadinessEvidence;
  plan: SandboxTestPlan;
}): SandboxManifest {
  return {
    artifact: SANDBOX_READINESS_ARTIFACT,
    schema_version: SANDBOX_READINESS_SCHEMA_VERSION,
    environment: "sandbox",
    label: SANDBOX_READINESS_LABEL,
    integration_id: input.evidence.applicationId,
    public_slug: input.evidence.publicSlug,
    policy_id: input.evidence.policyId,
    policy_version: input.evidence.policyVersion,
    verified_callback_host: verifiedCallbackHost({
      allowedReturnUrls: input.evidence.allowedReturnUrls,
      verifiedHostnames: input.evidence.verifiedHostnames,
    }),
    webhook_status: webhookStatus(input.evidence),
    supported_receipt_outcomes: SANDBOX_SUPPORTED_RECEIPT_OUTCOMES,
    readiness_state: input.plan.overall,
    score: input.plan.score,
    production_activation_eligible: input.plan.production_activation_eligible,
    sandbox_pass_is_not_production_authorization: true,
    next_action: input.plan.next_action,
    last_run_at: input.plan.last_run_at,
    blockers: input.plan.blockers.map((blocker) => ({
      code: blocker.code,
      detail: blocker.detail,
    })),
    stages: input.plan.stages.map((stage) => ({
      id: stage.id,
      status: stage.status,
      code: stage.code,
    })),
  };
}

function jsonNeedles(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

export function validateSandboxManifest(value: unknown): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!value || typeof value !== "object") {
    return { ok: false, errors: ["manifest_not_object"] };
  }
  const rec = value as Record<string, unknown>;
  if (rec.artifact !== SANDBOX_READINESS_ARTIFACT) errors.push("artifact_invalid");
  if (rec.schema_version !== SANDBOX_READINESS_SCHEMA_VERSION) errors.push("schema_version_invalid");
  if (rec.environment !== "sandbox") errors.push("environment_not_sandbox");
  if (rec.label !== SANDBOX_READINESS_LABEL) errors.push("label_not_sandbox_test");
  if (typeof rec.integration_id !== "string" || !rec.integration_id.trim()) errors.push("integration_id_missing");
  if (typeof rec.policy_id !== "string" || !rec.policy_id.trim()) errors.push("policy_id_missing");
  if (typeof rec.policy_version !== "number" || rec.policy_version < 1) errors.push("policy_version_invalid");
  if (rec.sandbox_pass_is_not_production_authorization !== true) {
    errors.push(SANDBOX_PASS_IS_NOT_PRODUCTION_AUTHORIZATION);
  }
  if (rec.production_activation_eligible === true && rec.readiness_state !== "pass") {
    errors.push("production_eligible_without_sandbox_pass");
  }
  if (!Array.isArray(rec.supported_receipt_outcomes)) {
    errors.push("supported_receipt_outcomes_missing");
  }
  const blob = jsonNeedles(value);
  for (const needle of SANDBOX_MANIFEST_FORBIDDEN_KEY_NEEDLES) {
    if (blob.includes(needle)) {
      errors.push(`forbidden_material:${needle}`);
    }
  }
  const keys = Object.keys(rec).join(" ").toLowerCase();
  if (keys.includes("jwt") || keys.includes("oauth") || keys.includes("wallet") || keys.includes("secret")) {
    errors.push("forbidden_key_name");
  }
  return { ok: errors.length === 0, errors };
}

export function sandboxManifestConformanceFixture(overrides: Partial<SandboxManifest> = {}): SandboxManifest {
  return {
    artifact: SANDBOX_READINESS_ARTIFACT,
    schema_version: SANDBOX_READINESS_SCHEMA_VERSION,
    environment: "sandbox",
    label: SANDBOX_READINESS_LABEL,
    integration_id: "00000000-0000-4000-8000-000000000001",
    public_slug: "acme-sandbox",
    policy_id: "acme-age-21-v1",
    policy_version: 1,
    verified_callback_host: "app.acme.example",
    webhook_status: "configured_enabled",
    supported_receipt_outcomes: SANDBOX_SUPPORTED_RECEIPT_OUTCOMES,
    readiness_state: "pass",
    score: { passed: 6, total: 6 },
    production_activation_eligible: false,
    sandbox_pass_is_not_production_authorization: true,
    next_action: "Sandbox checks passed. Production activation remains independently gated and is not performed here.",
    last_run_at: "2026-09-18T00:00:00.000Z",
    blockers: [],
    stages: [
      { id: "policy_configured", status: "pass", code: "policy_configured" },
      { id: "callback_allowlisted", status: "pass", code: "callback_allowlisted" },
      { id: "server_receipt_verification", status: "pass", code: "receipt_verified_sandbox" },
      { id: "fail_closed", status: "pass", code: "fail_closed_passed" },
      { id: "webhook_test", status: "pass", code: "webhook_test_queued" },
      { id: "policy_version_compatibility", status: "pass", code: "policy_version_compatible" },
    ],
    ...overrides,
  };
}
