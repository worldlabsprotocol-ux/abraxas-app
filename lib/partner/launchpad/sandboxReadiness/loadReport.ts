// FILE: lib/partner/launchpad/sandboxReadiness/loadReport.ts
// Assemble server-derived sandbox readiness. Reuses Launchpad health evidence sources.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { harnessPassedFromActivity } from "@/lib/partner/launchpad/partnerTestHarness";
import { getLaunchpadWebhookOverview } from "@/lib/partner/eventDelivery/launchpadWebhook";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { probePolicyChangeControlSchema } from "@/lib/policy/changeControl/schemaReady";
import { buildPolicyChangeControlOverview } from "@/lib/policy/changeControl/overview";
import { launchpadPolicyChangeControlHealthSlice } from "@/lib/policy/changeControl/health";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  SANDBOX_READINESS_STAGES,
  type SandboxReadinessCode,
  type SandboxReadinessStageId,
  type SandboxReadinessStatus,
} from "@/lib/partner/launchpad/sandboxReadiness/codes";
import { buildSandboxTestPlan, type SandboxReadinessEvidence } from "@/lib/partner/launchpad/sandboxReadiness/plan";
import { buildSandboxManifest } from "@/lib/partner/launchpad/sandboxReadiness/manifest";
import type { SandboxStageRunResult } from "@/lib/partner/launchpad/sandboxReadiness/execute";

const EXPECTED_KEY_SCOPES = ["verify:credential", "verify:registry", "webhooks:read"];

function lastRunsFromActivity(
  rows: Array<{ public_code: string | null; metadata?: Record<string, unknown>; created_at?: string }>,
): SandboxReadinessEvidence["lastStageRuns"] {
  const last: NonNullable<SandboxReadinessEvidence["lastStageRuns"]> = {};
  for (const row of rows) {
    if (row.metadata?.sandbox_readiness !== true) continue;
    const stage = row.metadata.stage;
    if (typeof stage !== "string" || !(SANDBOX_READINESS_STAGES as readonly string[]).includes(stage)) continue;
    if (last[stage as SandboxReadinessStageId]) continue;
    last[stage as SandboxReadinessStageId] = {
      at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      status: (typeof row.metadata.status === "string" ? row.metadata.status : "not_run") as SandboxReadinessStatus,
      code: (typeof row.metadata.code === "string" ? row.metadata.code : (row.public_code ?? "receipt_verification_not_run")) as SandboxReadinessCode,
    };
  }
  return last;
}

export async function collectSandboxReadinessEvidence(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
}): Promise<SandboxReadinessEvidence> {
  const sb = requireSupabaseAdmin();
  const keyIds = [input.application.api_key_id, input.application.production_api_key_id].filter(Boolean) as string[];
  const { data: keys } = keyIds.length
    ? await sb.from("partner_api_keys").select("id, revoked_at, scopes").in("id", keyIds)
    : { data: [] as Array<{ id: string; revoked_at: string | null; scopes?: string[] }> };
  const { data: domains } = await sb.from("partner_launchpad_domain_verifications")
    .select("hostname")
    .eq("application_id", input.application.id)
    .eq("partner_id", input.partnerId)
    .eq("status", "verified");
  const { data: activity } = await sb.from("partner_launchpad_activity")
    .select("event_type, public_code, metadata, created_at")
    .eq("application_id", input.application.id)
    .eq("partner_id", input.partnerId)
    .order("created_at", { ascending: false })
    .limit(200);

  const harness = harnessPassedFromActivity((activity ?? []) as Array<{
    event_type: string;
    public_code: string | null;
    metadata?: Record<string, unknown>;
  }>);
  const active = new Set((keys ?? []).filter((key) => !key.revoked_at).map((key) => key.id));
  const sandboxKey = (keys ?? []).find((key) => key.id === input.application.api_key_id && !key.revoked_at);
  const webhook = await getLaunchpadWebhookOverview({
    partnerId: input.partnerId,
    policyId: input.application.policy_id,
    policyVersion: input.application.policy_version,
    callbackConfigured: hasProductionLaunchpadCallback(input.application.allowed_return_urls),
  });
  const policySchema = await probePolicyChangeControlSchema();
  let policyOverview = null;
  if (policySchema.ready) {
    try {
      policyOverview = await buildPolicyChangeControlOverview({
        policyId: input.application.policy_id,
        partnerId: input.partnerId,
        focusApplication: input.application,
      });
    } catch {
      policyOverview = null;
    }
  }
  const policyChangeControl = launchpadPolicyChangeControlHealthSlice({
    schemaReady: policySchema.ready,
    overview: policyOverview,
    pinnedVersion: input.application.policy_version,
  });

  return {
    applicationId: input.application.id,
    partnerId: input.application.partner_id,
    publicSlug: input.application.public_slug,
    environment: input.application.environment,
    status: input.application.status,
    policyId: input.application.policy_id,
    policyVersion: input.application.policy_version,
    policyTemplateId: input.application.policy_template_id,
    allowedReturnUrls: input.application.allowed_return_urls,
    activeSandboxKey: Boolean(input.application.api_key_id && active.has(input.application.api_key_id)),
    keyScopes: Array.isArray(sandboxKey?.scopes) ? sandboxKey.scopes : [...EXPECTED_KEY_SCOPES],
    verifiedHostnames: (domains ?? []).map((domain) => String(domain.hostname)),
    harnessCompleted: harness.completed,
    webhookConfigured: webhook.webhook_configured,
    webhookEnabled: webhook.webhook_enabled,
    latestDeliveryStatus: webhook.latest_delivery_status,
    deliveryFailureBlocker: webhook.delivery_failure_blocker,
    schemaSkipCode: webhook.schema_skip_code,
    unsupportedEventTypes: webhook.unsupported_lifecycle_events ?? [],
    policySchemaReady: policySchema.ready,
    policyChangeControl: {
      status: policyChangeControl.status,
      nextAction: policyChangeControl.nextAction,
      blockerCode: policyChangeControl.blockerCode,
    },
    lastStageRuns: lastRunsFromActivity((activity ?? []) as Array<{
      public_code: string | null;
      metadata?: Record<string, unknown>;
      created_at?: string;
    }>),
  };
}

export async function buildSandboxReadinessReport(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
}) {
  const evidence = await collectSandboxReadinessEvidence(input);
  const plan = buildSandboxTestPlan(evidence);
  const manifest = buildSandboxManifest({ evidence, plan });
  return { evidence, plan, manifest };
}

export async function recordSandboxReadinessRun(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  run: SandboxStageRunResult;
  idempotencyKey?: string | null;
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  await recordLaunchpadActivity(sb, {
    applicationId: input.application.id,
    partnerId: input.partnerId,
    eventType: "sandbox_readiness_run",
    publicCode: input.run.code,
    metadata: {
      sandbox_readiness: true,
      stage: input.run.stage,
      status: input.run.status,
      code: input.run.code,
      label: input.run.label,
      duplicate: input.run.duplicate,
      production_usable: false,
      issues_production_receipt: false,
      idempotency_key: input.idempotencyKey?.trim() || null,
    },
  });
}
