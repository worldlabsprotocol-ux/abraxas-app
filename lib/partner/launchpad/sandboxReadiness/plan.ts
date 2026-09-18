// FILE: lib/partner/launchpad/sandboxReadiness/plan.ts
// Server-generated sandbox checklist from partner configuration. No client-supplied status is trusted.

import {
  FAIL_CLOSED_HARNESS_SCENARIOS,
  SANDBOX_PASS_IS_NOT_PRODUCTION_AUTHORIZATION,
  SANDBOX_READINESS_LABEL,
  SANDBOX_READINESS_STAGE_LABELS,
  SANDBOX_READINESS_STAGES,
  type SandboxReadinessCode,
  type SandboxReadinessStageId,
  type SandboxReadinessStatus,
} from "@/lib/partner/launchpad/sandboxReadiness/codes";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";
import {
  hasProductionLaunchpadCallback,
  isProductionLaunchpadCallback,
  isSafeLaunchpadCallbackHostname,
} from "@/lib/partner/launchpad/productionCallbackReadiness";
import { isVerifiedDomainForCallbacks } from "@/lib/partner/launchpad/domainVerification";
import { policyPackIsSandboxOnly, resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/customPolicy";
import type { PartnerHarnessScenarioId } from "@/lib/partner/launchpad/partnerTestHarness";
import type { PartnerVisibleDeliveryState } from "@/lib/partner/eventDelivery/contract";

export interface SandboxStageResult {
  id: SandboxReadinessStageId;
  label: string;
  status: SandboxReadinessStatus;
  code: SandboxReadinessCode;
  detail: string;
  runnable: boolean;
  last_run_at: string | null;
  environment_label: typeof SANDBOX_READINESS_LABEL;
}

export interface SandboxEvidenceCheck {
  id: "dns" | "key_scope" | "environment";
  label: string;
  status: SandboxReadinessStatus;
  code: SandboxReadinessCode;
  detail: string;
}

export interface SandboxReadinessEvidence {
  applicationId: string;
  partnerId: string;
  publicSlug: string;
  environment: "sandbox" | "production";
  status: string;
  policyId: string;
  policyVersion: number;
  policyTemplateId: string;
  allowedReturnUrls: string[];
  activeSandboxKey: boolean;
  keyScopes: string[];
  verifiedHostnames: string[];
  harnessCompleted: PartnerHarnessScenarioId[];
  webhookConfigured: boolean;
  webhookEnabled: boolean;
  latestDeliveryStatus: PartnerVisibleDeliveryState | null;
  deliveryFailureBlocker: boolean;
  schemaSkipCode: string | null;
  unsupportedEventTypes: string[];
  policySchemaReady: boolean;
  policyChangeControl: {
    status: "pass" | "action_required" | "blocked";
    nextAction: string;
    blockerCode: string | null;
  };
  lastStageRuns?: Partial<Record<SandboxReadinessStageId, { at: string; status: SandboxReadinessStatus; code: SandboxReadinessCode }>>;
}

export interface SandboxTestPlan {
  stages: SandboxStageResult[];
  evidence: SandboxEvidenceCheck[];
  overall: SandboxReadinessStatus;
  score: { passed: number; total: number };
  blockers: Array<{ stage: SandboxReadinessStageId | SandboxEvidenceCheck["id"]; code: SandboxReadinessCode; detail: string }>;
  next_action: string;
  production_activation_eligible: boolean;
  sandbox_pass_is_not_production_authorization: true;
  last_run_at: string | null;
  environment_label: typeof SANDBOX_READINESS_LABEL;
}

function localhostOnlyCallbacks(urls: string[]): boolean {
  if (!urls.length) return false;
  return urls.every((url) => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === "localhost" || host.endsWith(".localhost");
    } catch {
      return false;
    }
  });
}

function firstSafeCallbackHost(urls: string[]): string | null {
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (isSafeLaunchpadCallbackHostname(parsed.hostname, true)) {
        return parsed.hostname.toLowerCase();
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function verifiedCallbackHost(input: {
  allowedReturnUrls: string[];
  verifiedHostnames: string[];
}): string | null {
  const production = input.allowedReturnUrls.find(isProductionLaunchpadCallback);
  if (!production) return null;
  try {
    const host = new URL(production).hostname.toLowerCase();
    if (input.verifiedHostnames.map((item) => item.toLowerCase()).includes(host)) {
      return host;
    }
  } catch {
    return null;
  }
  return null;
}

function derivePolicyStage(evidence: SandboxReadinessEvidence): SandboxStageResult {
  const last = evidence.lastStageRuns?.policy_configured;
  if (evidence.policyId && evidence.policyVersion > 0) {
    return {
      id: "policy_configured",
      label: SANDBOX_READINESS_STAGE_LABELS.policy_configured,
      status: "pass",
      code: "policy_configured",
      detail: `Policy ${evidence.policyId} v${evidence.policyVersion} is pinned. Environment: ${evidence.environment}.`,
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  return {
    id: "policy_configured",
    label: SANDBOX_READINESS_STAGE_LABELS.policy_configured,
    status: "blocked",
    code: "policy_pin_missing",
    detail: "Configure a policy pack or pin before sandbox tests can run.",
    runnable: true,
    last_run_at: last?.at ?? null,
    environment_label: SANDBOX_READINESS_LABEL,
  };
}

function deriveCallbackStage(evidence: SandboxReadinessEvidence): SandboxStageResult {
  const last = evidence.lastStageRuns?.callback_allowlisted;
  const urls = evidence.allowedReturnUrls;
  if (!urls.length) {
    return {
      id: "callback_allowlisted",
      label: SANDBOX_READINESS_STAGE_LABELS.callback_allowlisted,
      status: "blocked",
      code: "callback_missing",
      detail: "Add an allowlisted callback URL before running holder-return tests.",
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  const valid = urls.filter((url) => isLaunchpadReturnUrlAllowlisted(urls, url));
  if (!valid.length) {
    return {
      id: "callback_allowlisted",
      label: SANDBOX_READINESS_STAGE_LABELS.callback_allowlisted,
      status: "fail",
      code: "callback_not_allowlisted",
      detail: "Configured return URLs failed Launchpad allowlist and hostname safety checks.",
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  if (localhostOnlyCallbacks(valid)) {
    return {
      id: "callback_allowlisted",
      label: SANDBOX_READINESS_STAGE_LABELS.callback_allowlisted,
      status: "pass",
      code: "callback_localhost_sandbox_only",
      detail: "Localhost callback is allowlisted for sandbox only. Production activation stays independently gated.",
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  return {
    id: "callback_allowlisted",
    label: SANDBOX_READINESS_STAGE_LABELS.callback_allowlisted,
    status: "pass",
    code: "callback_allowlisted",
    detail: `Allowlisted callback host ${firstSafeCallbackHost(valid) ?? "configured"}. Callback query parameters never authorize an action.`,
    runnable: true,
    last_run_at: last?.at ?? null,
    environment_label: SANDBOX_READINESS_LABEL,
  };
}

function deriveReceiptStage(evidence: SandboxReadinessEvidence): SandboxStageResult {
  const last = evidence.lastStageRuns?.server_receipt_verification;
  if (evidence.harnessCompleted.includes("approved")) {
    return {
      id: "server_receipt_verification",
      label: SANDBOX_READINESS_STAGE_LABELS.server_receipt_verification,
      status: "pass",
      code: "receipt_verified_sandbox",
      detail: "Signed sandbox receipt verified with evaluatePublicReceiptTrust. production_usable remains false.",
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  return {
    id: "server_receipt_verification",
    label: SANDBOX_READINESS_STAGE_LABELS.server_receipt_verification,
    status: "not_run",
    code: "receipt_verification_not_run",
    detail: "Run the approved sandbox receipt case. This never issues a production receipt.",
    runnable: true,
    last_run_at: last?.at ?? null,
    environment_label: SANDBOX_READINESS_LABEL,
  };
}

function deriveFailClosedStage(evidence: SandboxReadinessEvidence): SandboxStageResult {
  const last = evidence.lastStageRuns?.fail_closed;
  const missing = FAIL_CLOSED_HARNESS_SCENARIOS.filter((id) => !evidence.harnessCompleted.includes(id));
  if (missing.length === 0) {
    return {
      id: "fail_closed",
      label: SANDBOX_READINESS_STAGE_LABELS.fail_closed,
      status: "pass",
      code: "fail_closed_passed",
      detail: "Denied, expired, revoked, wrong-partner, and wrong-policy receipts fail closed.",
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  return {
    id: "fail_closed",
    label: SANDBOX_READINESS_STAGE_LABELS.fail_closed,
    status: "not_run",
    code: "fail_closed_not_run",
    detail: `Run remaining fail-closed cases: ${missing.join(", ")}.`,
    runnable: true,
    last_run_at: last?.at ?? null,
    environment_label: SANDBOX_READINESS_LABEL,
  };
}

function deriveWebhookStage(evidence: SandboxReadinessEvidence): SandboxStageResult {
  const last = evidence.lastStageRuns?.webhook_test;
  if (evidence.schemaSkipCode === "event_type_not_supported" && evidence.unsupportedEventTypes.length > 0) {
    // Extended types may be skipped; TEST EVENT remains the sandbox path.
  }
  if (!evidence.webhookConfigured) {
    return {
      id: "webhook_test",
      label: SANDBOX_READINESS_STAGE_LABELS.webhook_test,
      status: "blocked",
      code: "webhook_not_configured",
      detail: "Register an HTTPS webhook endpoint before sending a labeled TEST EVENT.",
      runnable: false,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  if (!evidence.webhookEnabled) {
    return {
      id: "webhook_test",
      label: SANDBOX_READINESS_STAGE_LABELS.webhook_test,
      status: "blocked",
      code: "webhook_disabled",
      detail: "Enable webhook delivery, then send a labeled TEST EVENT. Delivery is not authorization.",
      runnable: false,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  if (evidence.deliveryFailureBlocker || evidence.latestDeliveryStatus === "failed" || evidence.latestDeliveryStatus === "dead-lettered") {
    return {
      id: "webhook_test",
      label: SANDBOX_READINESS_STAGE_LABELS.webhook_test,
      status: "fail",
      code: "webhook_delivery_failed",
      detail: "A failed or dead-lettered delivery is blocking this stage. Fix the endpoint, then rerun the TEST EVENT.",
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  if (evidence.latestDeliveryStatus === "delivered" || last?.status === "pass") {
    return {
      id: "webhook_test",
      label: SANDBOX_READINESS_STAGE_LABELS.webhook_test,
      status: "pass",
      code: "webhook_test_queued",
      detail: "Labeled TEST EVENT accepted. HMAC verified on the sandbox fixture. Queued is not receipt authorization.",
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  return {
    id: "webhook_test",
    label: SANDBOX_READINESS_STAGE_LABELS.webhook_test,
    status: "not_run",
    code: "webhook_test_not_run",
    detail: "Send a labeled TEST EVENT and verify HMAC. Never treat the payload as authorization.",
    runnable: true,
    last_run_at: last?.at ?? null,
    environment_label: SANDBOX_READINESS_LABEL,
  };
}

function derivePolicyVersionStage(evidence: SandboxReadinessEvidence): SandboxStageResult {
  const last = evidence.lastStageRuns?.policy_version_compatibility;
  if (!evidence.policySchemaReady) {
    return {
      id: "policy_version_compatibility",
      label: SANDBOX_READINESS_STAGE_LABELS.policy_version_compatibility,
      status: "blocked",
      code: "policy_schema_unavailable",
      detail: "Policy Change Control schema is unavailable. Version adoption stays fail-closed.",
      runnable: false,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  if (evidence.policyChangeControl.blockerCode === "policy_version_not_adopted" || evidence.policyChangeControl.status === "action_required") {
    return {
      id: "policy_version_compatibility",
      label: SANDBOX_READINESS_STAGE_LABELS.policy_version_compatibility,
      status: "blocked",
      code: "policy_version_not_adopted",
      detail: evidence.policyChangeControl.nextAction,
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  if (evidence.policyChangeControl.status === "blocked") {
    return {
      id: "policy_version_compatibility",
      label: SANDBOX_READINESS_STAGE_LABELS.policy_version_compatibility,
      status: "blocked",
      code: (evidence.policyChangeControl.blockerCode as SandboxReadinessCode | null) ?? "policy_schema_unavailable",
      detail: evidence.policyChangeControl.nextAction,
      runnable: true,
      last_run_at: last?.at ?? null,
      environment_label: SANDBOX_READINESS_LABEL,
    };
  }
  return {
    id: "policy_version_compatibility",
    label: SANDBOX_READINESS_STAGE_LABELS.policy_version_compatibility,
    status: "pass",
    code: "policy_version_compatible",
    detail: `Pinned v${evidence.policyVersion} is compatible. Newer versions are unused until explicitly adopted.`,
    runnable: true,
    last_run_at: last?.at ?? null,
    environment_label: SANDBOX_READINESS_LABEL,
  };
}

function deriveEvidenceChecks(evidence: SandboxReadinessEvidence): SandboxEvidenceCheck[] {
  const domainVerified = isVerifiedDomainForCallbacks({
    allowedReturnUrls: evidence.allowedReturnUrls,
    verifiedHostnames: evidence.verifiedHostnames,
  });
  const expectedScopes = ["verify:credential", "verify:registry", "webhooks:read"];
  const scopesOk = evidence.activeSandboxKey && (
    evidence.keyScopes.length === 0
    || expectedScopes.every((scope) => evidence.keyScopes.includes(scope))
  );
  return [
    {
      id: "environment",
      label: "Environment",
      status: evidence.environment === "sandbox" ? "pass" : "pass",
      code: SANDBOX_PASS_IS_NOT_PRODUCTION_AUTHORIZATION,
      detail: `Runs stay labeled ${SANDBOX_READINESS_LABEL}. A sandbox pass is never production authorization.`,
    },
    {
      id: "key_scope",
      label: "Scoped API key",
      status: scopesOk ? "pass" : "blocked",
      code: scopesOk ? "key_scope_ready" : "sandbox_key_missing",
      detail: scopesOk
        ? "Active sandbox key is scoped to verify and webhook read. Secrets are never re-revealed here."
        : "Rotate an active sandbox credential before running receipt tests.",
    },
    {
      id: "dns",
      label: "DNS / callback ownership",
      status: domainVerified ? "pass" : "not_run",
      code: domainVerified ? "dns_verified" : "dns_not_verified",
      detail: domainVerified
        ? "Production callback host is DNS-verified. This is independent of sandbox pass."
        : "DNS verification is required for production activation, not for sandbox tests.",
    },
  ];
}

export function summarizeSandboxPlan(stages: SandboxStageResult[]): SandboxReadinessStatus {
  if (stages.some((stage) => stage.status === "fail")) return "fail";
  if (stages.some((stage) => stage.status === "blocked")) return "blocked";
  if (stages.some((stage) => stage.status === "not_run")) return "not_run";
  return "pass";
}

export function nextSandboxAction(plan: Pick<SandboxTestPlan, "stages" | "overall" | "production_activation_eligible">): string {
  if (plan.overall === "pass") {
    return plan.production_activation_eligible
      ? "Sandbox checks passed. Production activation remains independently gated and is not performed here."
      : "Sandbox checks passed. Complete DNS and production callback checks on the existing safety gate before activation.";
  }
  const blocked = plan.stages.find((stage) => stage.status === "blocked" || stage.status === "fail");
  if (blocked) return blocked.detail;
  const pending = plan.stages.find((stage) => stage.status === "not_run");
  if (pending) return `Run: ${pending.label}.`;
  return "Refresh server-derived readiness evidence.";
}

export function buildSandboxTestPlan(evidence: SandboxReadinessEvidence): SandboxTestPlan {
  const stages = SANDBOX_READINESS_STAGES.map((id) => {
    switch (id) {
      case "policy_configured":
        return derivePolicyStage(evidence);
      case "callback_allowlisted":
        return deriveCallbackStage(evidence);
      case "server_receipt_verification":
        return deriveReceiptStage(evidence);
      case "fail_closed":
        return deriveFailClosedStage(evidence);
      case "webhook_test":
        return deriveWebhookStage(evidence);
      case "policy_version_compatibility":
        return derivePolicyVersionStage(evidence);
    }
  });
  const evidenceChecks = deriveEvidenceChecks(evidence);
  const overall = summarizeSandboxPlan(stages);
  const pack = resolvePolicyPack(evidence.policyTemplateId);
  const custom = evidence.policyTemplateId === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID;
  const sandboxOnlyPack = custom || (pack ? policyPackIsSandboxOnly(pack) : true);
  const productionCallback = hasProductionLaunchpadCallback(evidence.allowedReturnUrls);
  const domainVerified = isVerifiedDomainForCallbacks({
    allowedReturnUrls: evidence.allowedReturnUrls,
    verifiedHostnames: evidence.verifiedHostnames,
  });
  const productionEligible = overall === "pass"
    && productionCallback
    && domainVerified
    && !sandboxOnlyPack
    && evidence.activeSandboxKey
    && !evidence.deliveryFailureBlocker;

  const lastRunCandidates = stages
    .map((stage) => stage.last_run_at)
    .filter((value): value is string => Boolean(value))
    .sort();

  const blockers = [
    ...stages
      .filter((stage) => stage.status === "fail" || stage.status === "blocked")
      .map((stage) => ({ stage: stage.id, code: stage.code, detail: stage.detail })),
    ...evidenceChecks
      .filter((check) => check.status === "fail" || check.status === "blocked")
      .map((check) => ({ stage: check.id, code: check.code, detail: check.detail })),
  ];

  const plan: SandboxTestPlan = {
    stages,
    evidence: evidenceChecks,
    overall,
    score: {
      passed: stages.filter((stage) => stage.status === "pass").length,
      total: stages.length,
    },
    blockers,
    next_action: "",
    production_activation_eligible: productionEligible,
    sandbox_pass_is_not_production_authorization: true,
    last_run_at: lastRunCandidates.at(-1) ?? null,
    environment_label: SANDBOX_READINESS_LABEL,
  };
  plan.next_action = nextSandboxAction(plan);
  return plan;
}

export function evaluateCallbackUrlAgainstAllowlist(input: {
  allowedReturnUrls: string[];
  callbackUrl?: string | null;
}): { status: SandboxReadinessStatus; code: SandboxReadinessCode; detail: string } {
  const candidate = input.callbackUrl?.trim();
  if (!input.allowedReturnUrls.length) {
    return {
      status: "blocked",
      code: "callback_missing",
      detail: "No callback is configured on this integration.",
    };
  }
  if (!candidate) {
    return {
      status: localhostOnlyCallbacks(input.allowedReturnUrls) ? "pass" : "pass",
      code: localhostOnlyCallbacks(input.allowedReturnUrls)
        ? "callback_localhost_sandbox_only"
        : "callback_allowlisted",
      detail: "Existing allowlisted callback accepted. Query parameters are not authorization.",
    };
  }
  if (!isLaunchpadReturnUrlAllowlisted(input.allowedReturnUrls, candidate)) {
    return {
      status: "fail",
      code: "callback_not_allowlisted",
      detail: "The supplied callback is not on this application's allowlist.",
    };
  }
  try {
    const host = new URL(candidate).hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost")) {
      return {
        status: "pass",
        code: "callback_localhost_sandbox_only",
        detail: "Localhost callback is sandbox-only.",
      };
    }
  } catch {
    return {
      status: "fail",
      code: "callback_not_allowlisted",
      detail: "The supplied callback is not a valid URL.",
    };
  }
  return {
    status: "pass",
    code: "callback_allowlisted",
    detail: "Callback host is allowlisted. Do not authorize from query parameters.",
  };
}
