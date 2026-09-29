// FILE: lib/partner/integrationObservability/health.ts
// Machine-readable relying-party integration health from persisted events.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { evaluateProductionIntegrationReadiness } from "@/lib/partner/productionIntegration/productionReadiness";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/load";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import type { IntegrationHealthStatus } from "./contract";
import type { IntegrationEventRow } from "./record";
import type { PartnerSafeFailureCode } from "./contract";

export interface IntegrationOperationalHealth {
  contract_version: string;
  status: IntegrationHealthStatus;
  environment: "sandbox" | "production";
  application_id: string;
  partner_id: string;
  last_request_at: string | null;
  last_receipt_issued_at: string | null;
  last_receipt_verified_at: string | null;
  verification_attempts: number;
  verification_successes: number;
  verification_failures: number;
  verification_success_rate: number | null;
  recent_failure_codes: PartnerSafeFailureCode[];
  credential_status: "active" | "revoked" | "never_issued";
  callback_status: "ready" | "missing" | "localhost_only";
  production_readiness_ok: boolean;
  production_readiness_blockers: string[];
  webhook_status: "not_selected" | "configured" | "degraded" | "unknown";
  recent_timeline: Array<{ at: string; label: string; outcome: string | null; reason: string | null }>;
  technical_proof: Array<{ stage: string; status: "observed" | "pending" | "failed"; at: string | null }>;
}

function latest(events: IntegrationEventRow[], type: string): string | null {
  const row = events.find((event) => event.event_type === type);
  return row?.created_at ?? null;
}

function callbackStatus(app: LaunchpadApplicationRow): IntegrationOperationalHealth["callback_status"] {
  const hasHttps = app.allowed_return_urls.some((url) => url.startsWith("https://"));
  const hasLocal = app.allowed_return_urls.some((url) => url.includes("localhost"));
  if (hasHttps) return "ready";
  if (hasLocal) return "localhost_only";
  return "missing";
}

export async function buildIntegrationOperationalHealth(input: {
  application: LaunchpadApplicationRow;
  events: IntegrationEventRow[];
  productionKeyRevoked?: boolean;
  webhookConfigured?: boolean;
  webhookDegraded?: boolean;
}): Promise<IntegrationOperationalHealth> {
  const app = input.application;
  const events = input.events;
  const verificationEvents = events.filter((event) =>
    event.event_type === "receipt_verification_succeeded"
    || event.event_type === "receipt_verification_failed",
  );
  const successes = verificationEvents.filter((event) => event.event_type === "receipt_verification_succeeded").length;
  const failures = verificationEvents.filter((event) => event.event_type === "receipt_verification_failed").length;
  const attempts = successes + failures;
  const evidence = await loadGoLiveEvidence({ application: app, partnerId: app.partner_id });
  const readiness = await evaluateProductionIntegrationReadiness({
    application: app,
    evidence,
    productionKeyRevoked: input.productionKeyRevoked,
    webhookRequired: input.webhookConfigured === true,
  });

  let credentialStatus: IntegrationOperationalHealth["credential_status"] = "never_issued";
  if (app.environment === "production" && app.production_api_key_id) {
    credentialStatus = input.productionKeyRevoked ? "revoked" : "active";
  } else if (app.api_key_id) {
    credentialStatus = "active";
  }

  const recentFailures = events
    .map((event) => event.partner_safe_reason)
    .filter((code): code is PartnerSafeFailureCode => Boolean(code))
    .slice(0, 5);

  let status: IntegrationHealthStatus = "healthy";
  if (readiness.blockers.includes("production_credential_revoked") || app.status !== "active") {
    status = "blocked";
  } else if (failures > 0 || readiness.blockers.length > 0 || input.webhookDegraded) {
    status = "degraded";
  }

  const proofStages = [
    { stage: "Request created", types: ["verification_request_created", "hosted_handoff_created"] },
    { stage: "Holder authorized", types: ["holder_flow_started"] },
    { stage: "Policy evaluated", types: ["policy_evaluated"] },
    { stage: "Receipt issued", types: ["receipt_issued"] },
    { stage: "Receipt verified server-side", types: ["receipt_verification_succeeded", "receipt_verification_failed"] },
    { stage: "Decision returned", types: ["access_decision_permit", "access_decision_deny"] },
  ];

  const technicalProof = proofStages.map(({ stage, types }) => {
    const hit = events.find((event) => types.includes(event.event_type));
    if (!hit) return { stage, status: "pending" as const, at: null };
    const failed = hit.event_type.includes("failed") || hit.event_type === "access_decision_deny";
    return {
      stage,
      status: failed ? "failed" as const : "observed" as const,
      at: hit.created_at,
    };
  });

  const timeline = events.slice(0, 12).map((event) => ({
    at: event.created_at,
    label: event.event_type.replace(/_/g, " "),
    outcome: event.outcome,
    reason: event.partner_safe_reason,
  }));

  return {
    contract_version: "1.0.0",
    status,
    environment: app.environment,
    application_id: app.id,
    partner_id: app.partner_id,
    last_request_at: latest(events, "verification_request_created") ?? latest(events, "hosted_handoff_created"),
    last_receipt_issued_at: latest(events, "receipt_issued"),
    last_receipt_verified_at: latest(events, "receipt_verification_succeeded"),
    verification_attempts: attempts,
    verification_successes: successes,
    verification_failures: failures,
    verification_success_rate: attempts > 0 ? Number((successes / attempts).toFixed(3)) : null,
    recent_failure_codes: Array.from(new Set(recentFailures)),
    credential_status: credentialStatus,
    callback_status: callbackStatus(app),
    production_readiness_ok: readiness.ok,
    production_readiness_blockers: readiness.blockers,
    webhook_status: input.webhookConfigured
      ? (input.webhookDegraded ? "degraded" : "configured")
      : "not_selected",
    recent_timeline: timeline,
    technical_proof: technicalProof,
  };
}
