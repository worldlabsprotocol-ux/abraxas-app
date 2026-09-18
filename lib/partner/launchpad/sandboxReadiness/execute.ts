// FILE: lib/partner/launchpad/sandboxReadiness/execute.ts
// Safe TEST-only stage execution. Tenant-scoped, rate-limited at the route, retries idempotent.

import { runLaunchpadTestScenario } from "@/lib/partner/launchpad/runTestScenario";
import { enqueueLaunchpadWebhookTest } from "@/lib/partner/eventDelivery/launchpadWebhook";
import { FAIL_CLOSED_HARNESS_SCENARIOS, SANDBOX_READINESS_LABEL, SANDBOX_READINESS_STAGES, type SandboxReadinessCode, type SandboxReadinessStageId, type SandboxReadinessStatus } from "@/lib/partner/launchpad/sandboxReadiness/codes";
import { evaluateCallbackUrlAgainstAllowlist } from "@/lib/partner/launchpad/sandboxReadiness/plan";
import {
  probeHarnessFailClosed,
  probeUnsignedReceipt,
  probeWebhookHmacFixture,
  probeWrongPolicyVersion,
  rejectUnsupportedEventType,
} from "@/lib/partner/launchpad/sandboxReadiness/probes";
import {
  recallSandboxRun,
  rememberSandboxRun,
} from "@/lib/partner/launchpad/sandboxReadiness/idempotency";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

export interface SandboxStageRunResult {
  stage: SandboxReadinessStageId;
  status: SandboxReadinessStatus;
  code: SandboxReadinessCode;
  detail: string;
  duplicate: boolean;
  label: typeof SANDBOX_READINESS_LABEL;
  probes?: Array<{ code: SandboxReadinessCode; status: SandboxReadinessStatus; detail: string }>;
  production_usable: false;
  issues_production_receipt: false;
}

export interface RunSandboxStageInput {
  application: LaunchpadApplicationRow;
  partnerId: string;
  stage: string;
  idempotencyKey?: string | null;
  callbackUrl?: string | null;
  eventType?: string | null;
  now?: Date;
  enqueueWebhookTest?: typeof enqueueLaunchpadWebhookTest;
  runHarness?: typeof runLaunchpadTestScenario;
}

export function isSandboxReadinessStage(value: string): value is SandboxReadinessStageId {
  return (SANDBOX_READINESS_STAGES as readonly string[]).includes(value);
}

function result(input: Omit<SandboxStageRunResult, "label" | "production_usable" | "issues_production_receipt" | "duplicate"> & { duplicate?: boolean }): SandboxStageRunResult {
  return {
    ...input,
    duplicate: input.duplicate === true,
    label: SANDBOX_READINESS_LABEL,
    production_usable: false,
    issues_production_receipt: false,
  };
}

async function runPolicyConfigured(app: LaunchpadApplicationRow): Promise<SandboxStageRunResult> {
  if (app.policy_id && app.policy_version > 0) {
    return result({
      stage: "policy_configured",
      status: "pass",
      code: "policy_configured",
      detail: `Policy ${app.policy_id} v${app.policy_version} is pinned.`,
    });
  }
  return result({
    stage: "policy_configured",
    status: "blocked",
    code: "policy_pin_missing",
    detail: "Configure a policy pack before sandbox tests.",
  });
}

async function runCallback(app: LaunchpadApplicationRow, callbackUrl?: string | null): Promise<SandboxStageRunResult> {
  const evaluated = evaluateCallbackUrlAgainstAllowlist({
    allowedReturnUrls: app.allowed_return_urls,
    callbackUrl,
  });
  return result({
    stage: "callback_allowlisted",
    status: evaluated.status,
    code: evaluated.code,
    detail: evaluated.detail,
  });
}

async function runReceiptVerification(input: RunSandboxStageInput): Promise<SandboxStageRunResult> {
  const runHarness = input.runHarness ?? runLaunchpadTestScenario;
  const harness = await runHarness({
    applicationId: input.application.id,
    partnerId: input.partnerId,
    scenarioId: "approved",
  });
  if (!harness.ok) {
    return result({
      stage: "server_receipt_verification",
      status: harness.code === "return_url_rejected" ? "fail" : "blocked",
      code: harness.code === "return_url_rejected" ? "callback_not_allowlisted" : "receipt_verification_not_run",
      detail: harness.code,
    });
  }
  if (!harness.result.passed || harness.result.production_usable) {
    return result({
      stage: "server_receipt_verification",
      status: "fail",
      code: "receipt_verified_sandbox",
      detail: "Approved sandbox receipt did not verify, or was marked production_usable.",
    });
  }
  return result({
    stage: "server_receipt_verification",
    status: "pass",
    code: "receipt_verified_sandbox",
    detail: "Signed sandbox receipt verified server-side. This is not a production receipt.",
  });
}

async function runFailClosed(input: RunSandboxStageInput): Promise<SandboxStageRunResult> {
  const runHarness = input.runHarness ?? runLaunchpadTestScenario;
  const probes = [
    probeUnsignedReceipt({
      partnerId: input.application.partner_id,
      policyId: input.application.policy_id,
      policyVersion: input.application.policy_version,
    }),
    probeWrongPolicyVersion({
      partnerId: input.application.partner_id,
      policyId: input.application.policy_id,
      policyVersion: input.application.policy_version,
    }),
    ...FAIL_CLOSED_HARNESS_SCENARIOS.map((scenarioId) => probeHarnessFailClosed({
      partnerId: input.application.partner_id,
      policyId: input.application.policy_id,
      policyVersion: input.application.policy_version,
      policyTemplateId: input.application.policy_template_id,
      scenarioId,
    })),
  ];

  for (const scenarioId of FAIL_CLOSED_HARNESS_SCENARIOS) {
    await runHarness({
      applicationId: input.application.id,
      partnerId: input.partnerId,
      scenarioId,
    });
  }

  const failed = probes.find((probe) => probe.status !== "pass");
  if (failed) {
    return result({
      stage: "fail_closed",
      status: "fail",
      code: failed.code,
      detail: failed.detail,
      probes: probes.map((probe) => ({ code: probe.code, status: probe.status, detail: probe.detail })),
    });
  }
  return result({
    stage: "fail_closed",
    status: "pass",
    code: "fail_closed_passed",
    detail: "Denied, expired, revoked, unsigned, wrong-partner, wrong-policy, and wrong-version receipts fail closed.",
    probes: probes.map((probe) => ({ code: probe.code, status: probe.status, detail: probe.detail })),
  });
}

async function runWebhook(input: RunSandboxStageInput): Promise<SandboxStageRunResult> {
  const unsupported = rejectUnsupportedEventType(input.eventType);
  if (unsupported) {
    return result({
      stage: "webhook_test",
      status: unsupported.status,
      code: unsupported.code,
      detail: unsupported.detail,
    });
  }
  const hmac = probeWebhookHmacFixture(input.partnerId);
  if (hmac.status !== "pass") {
    return result({
      stage: "webhook_test",
      status: hmac.status,
      code: hmac.code,
      detail: hmac.detail,
    });
  }
  const enqueue = input.enqueueWebhookTest ?? enqueueLaunchpadWebhookTest;
  const queued = await enqueue(input.partnerId);
  if (!queued.ok) {
    const mapped: SandboxReadinessCode = queued.code === "event_type_not_supported"
      ? "event_type_not_supported"
      : queued.code === "webhook_not_configured"
        ? "webhook_not_configured"
        : queued.code === "webhook_disabled"
          ? "webhook_disabled"
          : "webhook_delivery_failed";
    return result({
      stage: "webhook_test",
      status: mapped === "webhook_delivery_failed" ? "fail" : "blocked",
      code: mapped,
      detail: `TEST EVENT was not queued (${queued.code}). HMAC fixture still ${hmac.code}.`,
    });
  }
  return result({
    stage: "webhook_test",
    status: "pass",
    code: "webhook_test_queued",
    detail: `Labeled TEST EVENT ${queued.eventId} queued. HMAC fixture verified. Queued is not authorization.`,
  });
}

export async function runSandboxReadinessStage(input: RunSandboxStageInput): Promise<
  | { ok: true; result: SandboxStageRunResult }
  | { ok: false; code: SandboxReadinessCode; status?: number }
> {
  if (!isSandboxReadinessStage(input.stage)) {
    return { ok: false, code: "event_type_not_supported" };
  }

  const idempotencyKey = input.idempotencyKey?.trim();
  if (idempotencyKey) {
    const existing = recallSandboxRun({
      partnerId: input.partnerId,
      applicationId: input.application.id,
      stage: input.stage,
      idempotencyKey,
    });
    if (existing) {
      return {
        ok: true,
        result: result({
          stage: input.stage,
          status: existing.status as SandboxReadinessStatus,
          code: "sandbox_run_duplicate",
          detail: existing.detail,
          duplicate: true,
        }),
      };
    }
  }

  let run: SandboxStageRunResult;
  switch (input.stage) {
    case "policy_configured":
      run = await runPolicyConfigured(input.application);
      break;
    case "callback_allowlisted":
      run = await runCallback(input.application, input.callbackUrl);
      break;
    case "server_receipt_verification":
      run = await runReceiptVerification(input);
      break;
    case "fail_closed":
      run = await runFailClosed(input);
      break;
    case "webhook_test":
      run = await runWebhook(input);
      break;
    case "policy_version_compatibility":
      run = result({
        stage: "policy_version_compatibility",
        status: "not_run",
        code: "policy_version_compatible",
        detail: "Recompute this stage from live Policy Change Control evidence after GET.",
      });
      break;
  }

  if (idempotencyKey) {
    rememberSandboxRun({
      applicationId: input.application.id,
      partnerId: input.partnerId,
      stage: input.stage,
      idempotencyKey,
      status: run.status,
      code: run.code,
      detail: run.detail,
      at: (input.now ?? new Date()).toISOString(),
    });
  }
  return { ok: true, result: run };
}
