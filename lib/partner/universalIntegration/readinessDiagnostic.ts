// FILE: lib/partner/universalIntegration/readinessDiagnostic.ts
// Canonical integration readiness phases — derived from server state only.

import type { LaunchpadHealthStatus } from "@/lib/partner/launchpad/integrationHealth";
import type {
  LaunchpadApplicationRow,
  ProductionAccessRequestStatus,
} from "@/lib/partner/launchpad/types";

export const UNIVERSAL_READINESS_PHASES = [
  "not_configured",
  "configured",
  "sandbox_testing",
  "sandbox_verified",
  "production_review_required",
  "production_approved",
  "production_active",
  "blocked",
  "suspended_or_revoked",
] as const;

export type UniversalReadinessPhase = (typeof UNIVERSAL_READINESS_PHASES)[number];

export interface UniversalReadinessInput {
  application: Pick<
    LaunchpadApplicationRow,
    | "status"
    | "environment"
    | "policy_id"
    | "policy_version"
    | "allowed_return_urls"
    | "production_api_key_id"
    | "production_activated_at"
  >;
  activeSandboxKey: boolean;
  activeProductionKey: boolean;
  verifiedReceiptCount: number;
  harnessPassed: boolean;
  liveExecution?: {
    offline_harness_verified: boolean;
    live_holder_flow_completed: boolean;
    live_receipt_issued: boolean;
    live_e2e_complete: boolean;
  };
  productionAccessRequestStatus: ProductionAccessRequestStatus | null;
  integrationHealthOverall: LaunchpadHealthStatus;
}

export interface UniversalReadinessDiagnostic {
  phase: UniversalReadinessPhase;
  summary: string;
  blockers: string[];
  /** Maps to Launchpad journey signals without replacing them. */
  signals: {
    policy_pinned: boolean;
    sandbox_credential_active: boolean;
    integration_harness_passed: boolean;
    verified_receipt_observed: boolean;
    offline_harness_verified: boolean;
    live_holder_flow_completed: boolean;
    live_receipt_issued: boolean;
    live_e2e_complete: boolean;
    production_review_status: ProductionAccessRequestStatus | null;
    production_credential_active: boolean;
    production_activated: boolean;
  };
}

function hasMinimalConfiguration(app: UniversalReadinessInput["application"]): boolean {
  return Boolean(
    app.policy_id
    && app.policy_version > 0
    && app.allowed_return_urls.length > 0,
  );
}

/**
 * Derive a single operator-facing readiness phase. Fail-closed when health is blocked.
 */
export function deriveUniversalIntegrationReadiness(
  input: UniversalReadinessInput,
): UniversalReadinessDiagnostic {
  const { application: app } = input;
  const blockers: string[] = [];

  const live = input.liveExecution ?? {
    offline_harness_verified: false,
    live_holder_flow_completed: false,
    live_receipt_issued: false,
    live_e2e_complete: false,
  };
  const signals = {
    policy_pinned: Boolean(app.policy_id && app.policy_version > 0),
    sandbox_credential_active: input.activeSandboxKey,
    integration_harness_passed: input.harnessPassed,
    verified_receipt_observed: input.verifiedReceiptCount > 0,
    offline_harness_verified: live.offline_harness_verified,
    live_holder_flow_completed: live.live_holder_flow_completed,
    live_receipt_issued: live.live_receipt_issued,
    live_e2e_complete: live.live_e2e_complete,
    production_review_status: input.productionAccessRequestStatus,
    production_credential_active: input.activeProductionKey,
    production_activated: Boolean(app.production_activated_at && app.environment === "production"),
  };

  if (app.status === "suspended") {
    return {
      phase: "suspended_or_revoked",
      summary: "Application is suspended. Verification and production access are disabled.",
      blockers: ["application_suspended"],
      signals,
    };
  }

  if (app.status === "pending" || !hasMinimalConfiguration(app)) {
    if (!signals.policy_pinned) blockers.push("policy_not_pinned");
    if (app.allowed_return_urls.length === 0) blockers.push("callback_not_configured");
    return {
      phase: "not_configured",
      summary: "Finish application setup: select a policy and configure an allowed callback.",
      blockers,
      signals,
    };
  }

  if (input.integrationHealthOverall === "blocked") {
    blockers.push("integration_health_blocked");
    return {
      phase: "blocked",
      summary: "Integration health checks failed. Resolve blocked items before continuing.",
      blockers,
      signals,
    };
  }

  if (signals.production_activated && signals.production_credential_active) {
    return {
      phase: "production_active",
      summary: "Production activation is complete and a production credential is active.",
      blockers: [],
      signals,
    };
  }

  if (input.productionAccessRequestStatus === "approved" && !signals.production_activated) {
    return {
      phase: "production_approved",
      summary: "Production access is approved. Complete activation and credential issuance.",
      blockers: signals.production_credential_active ? [] : ["production_credential_missing"],
      signals,
    };
  }

  if (input.productionAccessRequestStatus === "pending") {
    return {
      phase: "production_review_required",
      summary: "Production access review is pending. Sandbox success does not grant production.",
      blockers: ["production_review_pending"],
      signals,
    };
  }

  if (signals.integration_harness_passed && signals.verified_receipt_observed) {
    const blockers: string[] = [];
    if (!signals.live_e2e_complete) {
      blockers.push("live_e2e_not_observed");
    }
    return {
      phase: "sandbox_verified",
      summary: signals.live_e2e_complete
        ? "Sandbox verified with live holder-flow completion and server-validated receipt."
        : "Sandbox contract verified (harness). Live holder-flow E2E not yet observed on this application.",
      blockers,
      signals,
    };
  }

  if (signals.sandbox_credential_active) {
    if (!signals.integration_harness_passed) blockers.push("harness_incomplete");
    if (!signals.verified_receipt_observed) blockers.push("no_verified_receipt");
    return {
      phase: "sandbox_testing",
      summary: "Sandbox credential is active. Run the integration harness and verify receipts server-side.",
      blockers,
      signals,
    };
  }

  blockers.push("sandbox_credential_missing");
  return {
    phase: "configured",
    summary: "Application is configured. Issue or rotate a sandbox credential to begin testing.",
    blockers,
    signals,
  };
}
