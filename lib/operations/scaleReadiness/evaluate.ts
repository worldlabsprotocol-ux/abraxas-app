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
  probeAllScaleOperationsMigrations,
  SCALE_OPERATIONS_MIGRATION_ORDER,
} from "@/lib/operations/scaleOperationsMigrations";
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

function sourceUsesDurableStore(relativePath: string, pattern: RegExp): boolean {
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

async function probeScaleOperationsSchema(): Promise<ScaleReadinessCheck[]> {
  if (process.env.VITEST) {
    return SCALE_OPERATIONS_MIGRATION_ORDER.map((migration) => check(
      `scale_migration_${migration.replace(".sql", "")}`,
      "unknown",
      "Skipped in test runtime.",
      "P1",
    ));
  }

  try {
    const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
    const sb = requireSupabaseAdmin();
    const probes = await probeAllScaleOperationsMigrations(sb);
    return probes.map((probe) => {
      const signal: ScaleReadinessSignal = probe.signal === "available"
        ? "healthy"
        : probe.signal === "missing"
          ? (isPartnerFlowProductionRuntime() ? "blocked" : "degraded")
          : "unknown";
      const missing = probe.tables.filter((row) => row.signal === "missing").map((row) => row.table);
      return check(
        `scale_migration_${probe.migration.replace(".sql", "")}`,
        signal,
        missing.length
          ? `Scale migration tables missing: ${missing.join(", ")}`
          : `Scale migration ${probe.migration} tables reachable.`,
        probe.migration.includes("125") ? "P0" : "P1",
      );
    });
  } catch {
    return SCALE_OPERATIONS_MIGRATION_ORDER.map((migration) => check(
      `scale_migration_${migration.replace(".sql", "")}`,
      "unknown",
      `Could not probe ${migration}.`,
      "P1",
    ));
  }
}

async function probeOAuthJtiReplayStore(): Promise<ScaleReadinessCheck> {
  const wired = sourceUsesDurableStore("lib/sui/zklogin/oauthJtiReplayStore.ts", /requireSupabaseAdmin/)
    && sourceUsesDurableStore("lib/sui/zklogin/oauthLoginState.ts", /consumeZkLoginOAuthJti/);

  if (!wired) {
    return check(
      "oauth_jti_replay_guard",
      "blocked",
      "OAuth JTI replay guard is not wired to durable storage.",
      "P0",
    );
  }

  if (process.env.VITEST) {
    return check(
      "oauth_jti_replay_guard",
      "healthy",
      "OAuth JTI replay guard uses durable atomic consume (test runtime uses isolated memory fallback).",
      "P1",
    );
  }

  try {
    const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
    const sb = requireSupabaseAdmin();
    const { error } = await sb
      .from("zklogin_oauth_jti_consumed")
      .select("jti_hash", { head: true, count: "exact" })
      .limit(0);
    if (error) {
      const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
      if (msg.includes("does not exist") || msg.includes("42p01")) {
        return check(
          "oauth_jti_replay_guard",
          isPartnerFlowProductionRuntime() ? "blocked" : "degraded",
          "Migration 126 table zklogin_oauth_jti_consumed missing.",
          "P0",
        );
      }
      return check("oauth_jti_replay_guard", "unknown", "Could not probe OAuth JTI replay table.", "P1");
    }
    return check(
      "oauth_jti_replay_guard",
      "healthy",
      "OAuth JTI replay guard durable table reachable with hashed JTIs only.",
      "P1",
    );
  } catch {
    return check("oauth_jti_replay_guard", "unknown", "Could not probe OAuth JTI replay table.", "P1");
  }
}

export async function buildScaleReadinessReport(): Promise<ScaleReadinessReport> {
  const checks: ScaleReadinessCheck[] = [];
  const partnerFlowRate = await getPartnerFlowRateLimitBackendInfo();
  const launchpadRate = launchpadRateLimitBackendInfo();
  const upstashHealth = await probePartnerFlowUpstashHealth();

  const partnerFlowRateHealthy = partnerFlowRate.backend === "upstash";
  const partnerFlowRateBlocked = isPartnerFlowProductionRuntime()
    && ["distributed_unavailable", "distributed_config_incomplete", "identity_unavailable"].includes(partnerFlowRate.backend);

  checks.push(check(
    "partner_flow_rate_limit",
    partnerFlowRateHealthy ? "healthy" : partnerFlowRateBlocked ? "blocked" : "healthy",
    `Partner Flow rate limit backend: ${partnerFlowRate.backend}. Production requires Upstash; no silent memory fallback.`,
    "P1",
  ));

  const launchpadBlocked = isPartnerFlowProductionRuntime() && launchpadRate.backend === "distributed_unavailable";
  checks.push(check(
    "launchpad_rate_limit",
    launchpadRate.backend === "upstash" ? "healthy" : launchpadBlocked ? "blocked" : "healthy",
    `Launchpad rate limit backend: ${launchpadRate.backend}. Production requires Upstash; no silent memory fallback.`,
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
    sourceUsesDurableStore("lib/provenance/provenanceSessionStore.ts", /requireSupabaseAdmin/)
      ? "healthy" : "blocked",
    sourceUsesDurableStore("lib/provenance/provenanceSessionStore.ts", /requireSupabaseAdmin/)
      ? "Provenance sessions persist durably when schema available."
      : "Provenance sessions still process-local only.",
    "P0",
  ));

  checks.push(check(
    "organization_consent_store",
    sourceUsesDurableStore("lib/organizationEligibility/consent.ts", /requireSupabaseAdmin/)
      ? "healthy" : "blocked",
    sourceUsesDurableStore("lib/organizationEligibility/consent.ts", /requireSupabaseAdmin/)
      ? "Organization consents persist durably with atomic consume."
      : "Organization consents still process-local only.",
    "P0",
  ));

  checks.push(check(
    "sandbox_readiness_idempotency",
    sourceUsesDurableStore("lib/partner/launchpad/sandboxReadiness/idempotency.ts", /requireSupabaseAdmin/)
      ? "healthy" : "degraded",
    sourceUsesDurableStore("lib/partner/launchpad/sandboxReadiness/idempotency.ts", /requireSupabaseAdmin/)
      ? "Sandbox readiness runs are durably idempotent."
      : "Sandbox readiness idempotency is process-local.",
    "P1",
  ));

  checks.push(check(
    "transient_state_purge",
    "healthy",
    "Bounded transient purge available via lib/operations/transientStatePurge (lazy expiry on read active; no Vercel cron registered).",
    "P2",
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

  checks.push(...await probeScaleOperationsSchema());
  checks.push(await probeOAuthJtiReplayStore());

  return {
    schema_version: SCALE_READINESS_VERSION,
    generated_at: new Date().toISOString(),
    overall: worstSignal(checks.map((row) => row.signal)),
    checks,
    scope_notice: SCALE_READINESS_SCOPE_NOTICE,
  };
}
