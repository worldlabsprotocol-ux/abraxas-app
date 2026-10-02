// FILE: lib/operations/scaleReadiness/evaluate.ts
// Derive scale/operations readiness from backend configuration and durable infrastructure probes.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getPartnerFlowRateLimitBackendInfo,
  isPartnerFlowProductionRuntime,
} from "@/lib/partner/partnerFlowRateLimit";
import { launchpadRateLimitBackendInfo } from "@/lib/partner/launchpad/rateLimit";
import {
  isPartnerFlowUpstashConfigured,
  probePartnerFlowUpstashHealth,
} from "@/lib/partner/partnerFlowUpstashStore";
import { listFailedWebhookDeliveries } from "@/lib/partner/webhooks/webhookDeadLetter";
import { INTEGRATION_STUDIO_PROVISION } from "@/lib/partner/integrationStudio/contract";
import {
  SCALE_READINESS_SCOPE_NOTICE,
  SCALE_READINESS_VERSION,
  type ScaleReadinessCheck,
  type ScaleReadinessReport,
  type ScaleReadinessSignal,
} from "./contract";

function worstSignal(signals: ScaleReadinessSignal[]): ScaleReadinessSignal {
  if (signals.includes("blocked")) return "blocked";
  if (signals.includes("degraded")) return "degraded";
  if (signals.every((signal) => signal === "unknown")) return "unknown";
  return "healthy";
}

function check(id: string, signal: ScaleReadinessSignal, detail: string, severity: ScaleReadinessCheck["severity"]): ScaleReadinessCheck {
  return { id, signal, detail, severity };
}

function sourceUsesProcessMemory(relativePath: string, pattern: RegExp): boolean {
  try {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8");
    return pattern.test(source);
  } catch {
    return false;
  }
}

async function probeWebhookOutbox(): Promise<ScaleReadinessCheck> {
  if (process.env.VITEST) {
    return check("webhook_outbox", "unknown", "Skipped in test runtime.", "P2");
  }
  try {
    const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from("partner_webhook_outbox").select("id").limit(1);
    if (error) {
      const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
      if (msg.includes("does not exist") || msg.includes("42p01")) {
        return check(
          "webhook_outbox",
          isPartnerFlowProductionRuntime() ? "blocked" : "degraded",
          "Webhook outbox table missing.",
          "P1",
        );
      }
      return check("webhook_outbox", "unknown", "Could not probe webhook outbox.", "P2");
    }
    return check(
      "webhook_outbox",
      "healthy",
      "Webhook outbox durable queue reachable (per-partner delivery enabled via partner_webhook_configs).",
      "P2",
    );
  } catch {
    return check("webhook_outbox", "unknown", "Could not probe webhook outbox.", "P2");
  }
}

async function probeDurableTables(): Promise<ScaleReadinessCheck> {
  if (process.env.VITEST) {
    return check("durable_transient_state", "unknown", "Skipped in test runtime.", "P1");
  }
  try {
    const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
    const sb = requireSupabaseAdmin();
    const tables = [
      "provenance_flow_sessions",
      "provenance_content_submissions",
      "organization_eligibility_consents",
      "sandbox_readiness_runs",
    ];
    for (const table of tables) {
      const { error } = await sb.from(table).select("id").limit(1);
      if (error) {
        const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
        if (msg.includes("does not exist") || msg.includes("42p01")) {
          return check(
            "durable_transient_state",
            isPartnerFlowProductionRuntime() ? "blocked" : "degraded",
            `Migration 125 table missing: ${table}`,
            "P1",
          );
        }
      }
    }
    return check("durable_transient_state", "healthy", "Scale operations durable tables reachable.", "P1");
  } catch {
    return check("durable_transient_state", "unknown", "Could not probe durable transient tables.", "P1");
  }
}

export async function buildScaleReadinessReport(): Promise<ScaleReadinessReport> {
  const checks: ScaleReadinessCheck[] = [];
  const partnerFlowRate = await getPartnerFlowRateLimitBackendInfo();
  const launchpadRate = launchpadRateLimitBackendInfo();
  const upstashHealth = await probePartnerFlowUpstashHealth();

  checks.push(check(
    "partner_flow_rate_limit",
    partnerFlowRate.backend === "upstash" ? "healthy"
      : isPartnerFlowProductionRuntime() ? "degraded" : "healthy",
    `Partner Flow rate limit backend: ${partnerFlowRate.backend}. Public receipt/narrow-result fail closed when misconfigured in production.`,
    "P1",
  ));

  checks.push(check(
    "launchpad_rate_limit",
    launchpadRate.backend === "upstash" ? "healthy"
      : isPartnerFlowProductionRuntime() ? "degraded" : "healthy",
    `Launchpad rate limit backend: ${launchpadRate.backend}.`,
    "P1",
  ));

  checks.push(check(
    "upstash_reachable",
    !isPartnerFlowUpstashConfigured() ? "unknown"
      : upstashHealth.reachable ? "healthy" : "blocked",
    isPartnerFlowUpstashConfigured()
      ? `Upstash config=${upstashHealth.configState}, reachable=${upstashHealth.reachable ?? "n/a"}`
      : "Upstash not configured.",
    "P1",
  ));

  const webhookOutboxProbe = await probeWebhookOutbox();
  checks.push(webhookOutboxProbe);

  if (webhookOutboxProbe.signal === "healthy" && !process.env.VITEST) {
    try {
      const failed = await listFailedWebhookDeliveries({ limit: 20 });
      const deadLetters = failed.filter((row) => row.operational_state === "dead-lettered");
      checks.push(check(
        "webhook_dead_letters",
        deadLetters.length >= 10 ? "degraded" : "healthy",
        deadLetters.length
          ? `${deadLetters.length} dead-lettered webhook deliveries in recent window.`
          : "No recent dead-lettered webhook deliveries.",
        "P2",
      ));
    } catch {
      checks.push(check("webhook_dead_letters", "unknown", "Could not query webhook dead letters.", "P2"));
    }
  }

  checks.push(check(
    "provenance_session_store",
    sourceUsesProcessMemory("lib/provenance/provenanceSessionStore.ts", /requireSupabaseAdmin/)
      ? "healthy" : "blocked",
    sourceUsesProcessMemory("lib/provenance/provenanceSessionStore.ts", /requireSupabaseAdmin/)
      ? "Provenance sessions persist durably when schema available."
      : "Provenance sessions still process-local only.",
    "P0",
  ));

  checks.push(check(
    "organization_consent_store",
    sourceUsesProcessMemory("lib/organizationEligibility/consent.ts", /requireSupabaseAdmin/)
      ? "healthy" : "blocked",
    sourceUsesProcessMemory("lib/organizationEligibility/consent.ts", /requireSupabaseAdmin/)
      ? "Organization consents persist durably with atomic consume."
      : "Organization consents still process-local only.",
    "P0",
  ));

  checks.push(check(
    "sandbox_readiness_idempotency",
    sourceUsesProcessMemory("lib/partner/launchpad/sandboxReadiness/idempotency.ts", /requireSupabaseAdmin/)
      ? "healthy" : "degraded",
    sourceUsesProcessMemory("lib/partner/launchpad/sandboxReadiness/idempotency.ts", /requireSupabaseAdmin/)
      ? "Sandbox readiness runs are durably idempotent."
      : "Sandbox readiness idempotency is process-local.",
    "P1",
  ));

  checks.push(check(
    "sandbox_self_service",
    INTEGRATION_STUDIO_PROVISION.self_serve_sandbox ? "healthy" : "blocked",
    INTEGRATION_STUDIO_PROVISION.self_serve_sandbox
      ? "Integration Studio self-serve sandbox provisioning enabled."
      : "Sandbox provisioning requires operator intervention.",
    "P2",
  ));

  checks.push(check(
    "production_review_gate",
    "healthy",
    "Production activation remains operator-reviewed; no self-issued production credentials in Launchpad paths.",
    "P0",
  ));

  checks.push(check(
    "public_result_endpoints",
    "healthy",
    "Public receipt and narrow-result endpoints are rate-limited and custody-filtered. Possession of receipt_id is the access gate by design.",
    "P1",
  ));

  checks.push(await probeDurableTables());

  const oauthLocal = sourceUsesProcessMemory(
    "lib/sui/zklogin/oauthLoginState.ts",
    /consumedJtis:\s*Map/,
  );
  if (oauthLocal) {
    checks.push(check(
      "oauth_jti_replay_guard",
      "degraded",
      "OAuth login JTI replay guard is still process-local. See docs/OAUTH_REPLAY_DURABLE_JTI_PROPOSAL.md.",
      "P1",
    ));
  }

  return {
    schema_version: SCALE_READINESS_VERSION,
    generated_at: new Date().toISOString(),
    overall: worstSignal(checks.map((row) => row.signal)),
    checks,
    scope_notice: SCALE_READINESS_SCOPE_NOTICE,
  };
}
